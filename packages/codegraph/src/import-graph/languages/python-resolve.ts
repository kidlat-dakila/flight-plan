import * as path from "node:path"
import type { PyPackages } from "./python-module-roots"

export type PyResolved
  = | { kind: "file", path: string }
    | { kind: "external", module: string }

const normalise = (value: string): string => value.split(path.sep).join("/")

function join(baseDir: string, segments: string[]): string {
  const parts = [baseDir, ...segments].filter((part) => part !== "")
  if (parts.length === 0) return ""
  return normalise(path.posix.normalize(parts.join("/")))
}

function isPackageDir(dir: string, files: ReadonlySet<string>): boolean {
  const init1 = dir === "" ? "__init__.py" : `${dir}/__init__.py`
  const init2 = dir === "" ? "__init__.pyi" : `${dir}/__init__.pyi`
  if (files.has(init1) || files.has(init2)) return true
  const prefix = dir === "" ? "" : `${dir}/`
  if (dir === "") return false
  for (const f of files) {
    if (f.startsWith(prefix)) return true
  }
  return false
}

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

function resolveSegments(segments: string[], baseDir: string, files: ReadonlySet<string>): string | null {
  if (segments.length === 0) {
    const init = baseDir === "" ? "__init__.py" : `${baseDir}/__init__.py`
    return files.has(init) ? init : null
  }

  const packageDirs = segments.slice(0, -1).map((_, index) => join(baseDir, segments.slice(0, index + 1)))
  return packageDirs.every((dir) => isPackageDir(dir, files)) ? moduleFile(join(baseDir, segments), files) : null
}

function resolveUnderRoot(
  module: string,
  imported: string,
  root: string,
  files: ReadonlySet<string>,
): string | null {
  const moduleSegments = module === "" ? [] : module.split(".")

  if (imported !== "") {
    const withImported = resolveSegments([...moduleSegments, imported], root, files)
    if (withImported !== null) return withImported
  }

  return resolveSegments(moduleSegments, root, files)
}

function climbedFrom(directory: string, climbs: number): string | null {
  if (climbs <= 0) return directory
  if (directory === "") return null
  const parent = path.posix.dirname(directory)
  return climbedFrom(parent === "." ? "" : parent, climbs - 1)
}

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
    const base = climbedFrom(fromDir === "." ? "" : fromDir, level - 1)
    const found = base === null ? null : resolveUnderRoot(module, imported, base, files)
    return found === null ? { kind: "external", module } : { kind: "file", path: found }
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
