/**
 * Which file a Python import names, decided against a set of paths.
 *
 * The Python analogue of `tracer/typescript/resolve.ts`: nothing here touches
 * the filesystem, `files` is the exact existence oracle, and the answer is
 * exact for whatever version of the tree was handed in.
 *
 * Python's import grammar differs from TypeScript's specifier strings in two
 * ways that shape the algorithm:
 *
 * - A module path is dotted segments, each of which can be a *regular*
 *   package (a directory with `__init__.py`) or, since PEP 420, a
 *   *namespace* package (a directory with no `__init__.py` at all, whose
 *   only evidence of existing is that some file in the tree sits under it).
 * - `from pkg import thing` is ambiguous on its face: `thing` might be a
 *   submodule (`pkg/thing.py`) or an attribute defined inside `pkg`'s own
 *   `__init__.py`. Only the former is a distinct file; the latter resolves
 *   to `pkg`'s own module file, and the caller (the barrel-chasing pass over
 *   `PyReExport`s) is the one that walks further from there.
 */
import * as path from "node:path"
import type { PyPackages } from "./moduleRoots"

/** Where an import points. */
export type PyResolved =
  /** A file in the set, as a repository-relative path. */
  | { kind: "file"; path: string }
  /** Not in the set, therefore somebody else's code (stdlib, an installed dependency, or an unreachable root). */
  | { kind: "external"; module: string }

/** Git speaks posix paths, so everything here does too. */
const normalise = (value: string): string => value.split(path.sep).join("/")

/** Joins segments under `baseDir`, normalised to posix. `""` segments are dropped. */
function join(baseDir: string, segments: string[]): string {
  const parts = [baseDir, ...segments].filter((part) => part !== "")
  if (parts.length === 0) return ""
  return normalise(path.posix.normalize(parts.join("/")))
}

/** Whether `dir` exists as a package directory: a regular package (`__init__.py`) or a PEP 420 namespace package. */
function isPackageDir(dir: string, files: ReadonlySet<string>): boolean {
  const init1 = dir === "" ? "__init__.py" : `${dir}/__init__.py`
  const init2 = dir === "" ? "__init__.pyi" : `${dir}/__init__.pyi`
  if (files.has(init1) || files.has(init2)) return true
  // PEP 420 namespace package: no __init__, but some file sits under it.
  const prefix = dir === "" ? "" : `${dir}/`
  if (dir === "") return false // "" is never itself a namespace package probe target
  for (const f of files) {
    if (f.startsWith(prefix)) return true
  }
  return false
}

/** The file a final path segment resolves to: `<path>.py`, `<path>.pyi`, or `<path>/__init__.py`. */
function moduleFile(pathSoFar: string, files: ReadonlySet<string>): string | null {
  const py = `${pathSoFar}.py`
  if (files.has(py)) return py
  const pyi = `${pathSoFar}.pyi`
  if (files.has(pyi)) return pyi
  const init = `${pathSoFar}/__init__.py`
  if (files.has(init)) return init
  const initPyi = `${pathSoFar}/__init__.pyi`
  if (files.has(initPyi)) return initPyi
  return null
}

/**
 * Walks `segments` under `baseDir`, requiring every segment but the last to
 * resolve as a package directory, and the last to resolve as a module file
 * (`.py`/`.pyi`/`/__init__.py`). Returns the resolved file, or null when any
 * step fails. `files` is the existence oracle.
 */
function resolveSegments(segments: string[], baseDir: string, files: ReadonlySet<string>): string | null {
  if (segments.length === 0) {
    // Resolving to the directory itself, e.g. `from . import x` with no
    // module segments landing on the current package's own `__init__.py`.
    const init = baseDir === "" ? "__init__.py" : `${baseDir}/__init__.py`
    return files.has(init) ? init : null
  }

  let dir = baseDir
  for (let i = 0; i < segments.length - 1; i++) {
    dir = join(dir, [segments[i] ?? ""])
    if (!isPackageDir(dir, files)) return null
  }

  const last = join(dir, [segments[segments.length - 1] ?? ""])
  return moduleFile(last, files)
}

/**
 * Resolves `module` (dotted, no leading dots) under one root, optionally
 * followed by `imported` as a further segment when it is a submodule rather
 * than an attribute. Returns the file, or null when nothing under this root
 * matches.
 */
function resolveUnderRoot(
  module: string,
  imported: string,
  root: string,
  files: ReadonlySet<string>,
): string | null {
  const moduleSegments = module === "" ? [] : module.split(".")

  // `from pkg import thing` where `thing` is a submodule of `pkg`, not an
  // attribute defined in `pkg`'s own file: try the longer path first so a
  // real submodule wins over the module-only resolution.
  if (imported !== "") {
    const withImported = resolveSegments([...moduleSegments, imported], root, files)
    if (withImported !== null) return withImported
  }

  return resolveSegments(moduleSegments, root, files)
}

/**
 * Resolves a Python import to the file that defines the imported name.
 *
 * - Absolute (`level === 0`): tries each of `roots` in order, then — for the
 *   module's first segment — the cross-package map, so `import apkg.pricing`
 *   from one workspace package can land in another. First hit wins; else
 *   `external`.
 * - Relative (`level > 0`): climbs `level - 1` directories from `fromFile`'s
 *   own directory (`level === 1` is the current package), then descends
 *   `module`'s segments from there.
 */
export function resolveModule(
  fromFile: string,
  module: string,
  level: number,
  imported: string,
  files: ReadonlySet<string>,
  roots: string[],
  packages: PyPackages | null,
): PyResolved {
  if (level > 0) {
    const fromDir = path.posix.dirname(normalise(fromFile))
    let base = fromDir === "." ? "" : fromDir
    // Climbing past the repository root names nothing a set of repo-relative
    // paths can match, exactly like the TS resolver's `..`-prefixed guard.
    for (let i = 0; i < level - 1; i++) {
      if (base === "") return { kind: "external", module }
      base = path.posix.dirname(base)
      if (base === ".") base = ""
    }
    const found = resolveUnderRoot(module, imported, base, files)
    if (found !== null) return { kind: "file", path: found }
    return { kind: "external", module }
  }

  for (const root of roots) {
    const found = resolveUnderRoot(module, imported, root, files)
    if (found !== null) return { kind: "file", path: found }
  }

  if (packages !== null && module !== "") {
    const firstSegment = module.split(".")[0] ?? ""
    const entry = packages.get(firstSegment)
    if (entry !== undefined) {
      const found = resolveUnderRoot(module, imported, entry.dir, files)
      if (found !== null) return { kind: "file", path: found }
    }
  }

  return { kind: "external", module }
}
