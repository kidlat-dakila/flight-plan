/**
 * Finding the import roots a Python file resolves absolute imports against.
 *
 * Mirrors `tracer/typescript/tsconfig.ts`'s per-file, memoised nearest-config
 * walk, but the "config" here is one of three markers — `pyproject.toml`,
 * `setup.cfg`, `setup.py` — and what each says about layout differs. A
 * project's absolute imports (`import pkg.mod`) resolve against its `src/`
 * directory when it declares a src-layout, else the project directory
 * itself; the repository root is always tried too, since a monorepo's
 * cross-package imports and a script run from the repo root both resolve
 * bare names against it.
 *
 * `pythonPackages` is the Python analogue of `tracer/typescript/packages.ts`:
 * it scans every discovered root for the top-level importable names rooted
 * there (an `__init__.py` directory, or a single-module `name.py`), so a
 * later resolver can turn `import otherpkg` into the file that defines it
 * without walking the whole tree per specifier.
 */
import * as path from "node:path"
import { parse as parseToml } from "smol-toml"

/** Reads a file's text out of the repo, or null when it cannot be read. */
type Read = (path: string) => Promise<string | null>

/** Where one top-level importable name roots. */
export type PyPackageEntry = { dir: string; topLevel: string }

/** top-level importable name -> where it roots. */
export type PyPackages = ReadonlyMap<string, PyPackageEntry>

const MARKERS = ["pyproject.toml", "setup.cfg", "setup.py"] as const

/** Joins a project directory and a relative sub-path, normalised to posix and repo-rooted. */
function join(dir: string, sub: string): string {
  const joined = dir === "" ? sub : path.posix.normalize(path.posix.join(dir, sub))
  return joined === "." ? "" : joined
}

/**
 * Whether a `pyproject.toml` declares a src-layout, from either of the build
 * backends that say so explicitly (setuptools, poetry). Any one naming
 * `"src"` is enough; the exact package/module list is not needed here, only
 * the directory imports root against.
 */
function pyprojectIsSrcLayout(text: string): boolean {
  let parsed: unknown
  try {
    parsed = parseToml(text)
  } catch {
    return false
  }
  if (typeof parsed !== "object" || parsed === null) return false
  const root = parsed as Record<string, unknown>
  const tool = root.tool
  if (typeof tool !== "object" || tool === null) return false
  const toolRecord = tool as Record<string, unknown>

  // [tool.setuptools] package-dir = { "" = "src" }
  const setuptools = toolRecord.setuptools
  if (typeof setuptools === "object" && setuptools !== null) {
    const packageDir = (setuptools as Record<string, unknown>)["package-dir"]
    if (typeof packageDir === "object" && packageDir !== null) {
      const root_ = (packageDir as Record<string, unknown>)[""]
      if (typeof root_ === "string" && root_.replace(/\/+$/, "") === "src") return true
    }
  }

  // [tool.poetry] packages = [{ include = "pkg", from = "src" }]
  const poetry = toolRecord.poetry
  if (typeof poetry === "object" && poetry !== null) {
    const packages = (poetry as Record<string, unknown>).packages
    if (Array.isArray(packages)) {
      for (const entry of packages) {
        if (typeof entry !== "object" || entry === null) continue
        const from = (entry as Record<string, unknown>).from
        if (typeof from === "string" && from.replace(/\/+$/, "") === "src") return true
      }
    }
  }

  // Hatch has no single canonical "package-dir: src" key (it infers layout
  // from directory structure and several sub-tables under
  // [tool.hatch.build]); out of scope for the required layouts here. A hatch
  // project falls through to the flat-layout default below, which is still
  // correct for the common case of a project dir that just happens to also
  // hold a `src/` directory hatch discovers on its own.

  return false
}

/**
 * `setup.cfg`'s `[options] package_dir` key, read with a tiny tolerant line
 * scanner rather than a full INI parser — it is the only key this cares
 * about. Handles both `package_dir = \n    =src` (indented continuation) and
 * `package_dir = =src` (same-line) forms.
 */
function setupCfgIsSrcLayout(text: string): boolean {
  const lines = text.split(/\r?\n/)
  let inOptions = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    const sectionMatch = /^\s*\[([^\]]+)\]\s*$/.exec(line)
    if (sectionMatch !== null) {
      inOptions = sectionMatch[1]?.trim().toLowerCase() === "options"
      continue
    }
    if (!inOptions) continue

    const keyMatch = /^\s*package_dir\s*=\s*(.*)$/.exec(line)
    if (keyMatch === null) continue

    const values: string[] = []
    const inline = keyMatch[1]?.trim() ?? ""
    if (inline !== "") values.push(inline)
    // INI-style continuation: subsequent indented lines belong to this key.
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j] ?? ""
      if (next.trim() === "") continue
      if (!/^\s+/.test(next)) break
      values.push(next.trim())
    }

    for (const value of values) {
      // `=src` or `"" = src`, possibly quoted.
      const eq = /^["']?["']?\s*=\s*["']?([^"'\s]+)["']?$/.exec(value)
      if (eq !== null && eq[1]?.replace(/\/+$/, "") === "src") return true
    }
    return false
  }
  return false
}

/**
 * `setup.py`'s layout, guessed with a best-effort regex since it is code we
 * do not execute. Looks for the two common literal spellings of a src-layout
 * declaration; anything else (computed values, f-strings, a `find_packages`
 * call) is out of scope and falls back to the project directory.
 */
function setupPyIsSrcLayout(text: string): boolean {
  return (
    /package_dir\s*=\s*\{\s*["']{2}\s*:\s*["']src["']\s*\}/.test(text) ||
    /where\s*=\s*["']src["']/.test(text)
  )
}

/** The import root a project declares for itself, given its marker file's text. */
async function rootOf(dir: string, marker: (typeof MARKERS)[number], text: string): Promise<string> {
  const srcLayout =
    marker === "pyproject.toml"
      ? pyprojectIsSrcLayout(text)
      : marker === "setup.cfg"
        ? setupCfgIsSrcLayout(text)
        : setupPyIsSrcLayout(text)
  return srcLayout ? join(dir, "src") : dir
}

/** The nearest ancestor directory (at or above `directory`) holding a marker, else null. */
function nearestMarker(directory: string, files: ReadonlySet<string>): { dir: string; marker: (typeof MARKERS)[number] } | null {
  let here = directory
  for (;;) {
    for (const marker of MARKERS) {
      const candidate = here === "" ? marker : `${here}/${marker}`
      if (files.has(candidate)) return { dir: here, marker }
    }
    if (here === "") return null
    const parent = path.posix.dirname(here)
    here = parent === here ? "" : parent
  }
}

/** Every ancestor directory of `directory` (inclusive) literally named `src`. */
function ancestorSrcDirs(directory: string): string[] {
  const out: string[] = []
  let here = directory
  for (;;) {
    if (path.posix.basename(here) === "src") out.push(here)
    if (here === "") break
    const parent = path.posix.dirname(here)
    if (parent === here) break
    here = parent
  }
  return out
}

export function rootsFinder(files: ReadonlySet<string>, read: Read): (fromFile: string) => Promise<string[]> {
  // Every file in a directory shares the same nearest project and root.
  const byDirectory = new Map<string, Promise<string[]>>()

  return (fromFile) => {
    const directory = path.posix.dirname(fromFile)
    const normalisedDirectory = directory === "." ? "" : directory
    let held = byDirectory.get(normalisedDirectory)
    if (held === undefined) {
      held = (async () => {
        const found = nearestMarker(normalisedDirectory, files)
        if (found !== null) {
          const markerPath = found.dir === "" ? found.marker : `${found.dir}/${found.marker}`
          const text = await read(markerPath)
          if (text !== null) {
            const root = await rootOf(found.dir, found.marker, text)
            const roots = [root]
            if (!roots.includes("")) roots.push("")
            return roots
          }
        }
        // No marker (or it could not be read): the repo root, plus any
        // ancestor directory literally named `src`.
        const roots = [...ancestorSrcDirs(normalisedDirectory), ""]
        return [...new Set(roots)]
      })()
      byDirectory.set(normalisedDirectory, held)
    }
    return held
  }
}

/** The top-level importable names rooted directly under `root`: `pkg/__init__.py` dirs and single `name.py` modules. */
function topLevelNamesOf(root: string, files: ReadonlySet<string>): string[] {
  const names = new Set<string>()
  const prefix = root === "" ? "" : `${root}/`
  for (const file of files) {
    if (!file.startsWith(prefix)) continue
    const rest = file.slice(prefix.length)
    if (rest === "") continue
    const segments = rest.split("/")
    if (segments.length === 2 && segments[1] === "__init__.py") {
      const name = segments[0]
      if (name !== undefined && name !== "") names.add(name)
    } else if (segments.length === 1 && rest.endsWith(".py") && rest !== "__init__.py") {
      names.add(rest.slice(0, -".py".length))
    }
  }
  return [...names]
}

export async function pythonPackages(files: ReadonlySet<string>, read: Read): Promise<PyPackages> {
  const map = new Map<string, PyPackageEntry>()

  // One root per project directory (not per file), discovered from each
  // marker directly rather than through `rootsFinder`'s per-file cache.
  const roots = new Set<string>()
  for (const file of files) {
    const base = path.posix.basename(file)
    if (!(MARKERS as readonly string[]).includes(base)) continue
    const dir = path.posix.dirname(file)
    const projectDir = dir === "." ? "" : dir
    const text = await read(file)
    if (text === null) continue
    const marker = base as (typeof MARKERS)[number]
    roots.add(await rootOf(projectDir, marker, text))
  }
  // A repo with no markers at all still roots at "" for a flat single project.
  if (roots.size === 0) roots.add("")

  for (const root of roots) {
    for (const topLevel of topLevelNamesOf(root, files)) {
      if (!map.has(topLevel)) map.set(topLevel, { dir: root, topLevel })
    }
  }

  return map
}
