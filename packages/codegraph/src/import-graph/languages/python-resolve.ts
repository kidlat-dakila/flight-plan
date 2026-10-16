import * as path from "node:path"
import { isPackageEntry } from "./python-importer-patterns"
import type { PyPackages } from "./python-module-roots"

export type PyResolved
  = | { kind: "file", path: string }
    | { kind: "external", module: string }

export type BindsName = (packageEntry: string, name: string) => boolean

const bindsNoName: BindsName = () => false

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

const MODULE_FILE_SUFFIXES = ["/__init__.py", ".py", "/__init__.pyi", ".pyi"]

function moduleFile(pathSoFar: string, files: ReadonlySet<string>): string | null {
  return MODULE_FILE_SUFFIXES.map((suffix) => `${pathSoFar}${suffix}`).find((candidate) => files.has(candidate)) ?? null
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
  bindsName: BindsName,
): string | null {
  const moduleSegments = module === "" ? [] : module.split(".")
  const found = resolveSegments(moduleSegments, root, files)
  if (imported === "") return found
  if (found !== null && isPackageEntry(found) && bindsName(found, imported)) return found
  return resolveSegments([...moduleSegments, imported], root, files) ?? found
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
  bindsName: BindsName = bindsNoName,
): PyResolved {
  if (level > 0) {
    const fromDir = path.posix.dirname(normalise(fromFile))
    const base = climbedFrom(fromDir === "." ? "" : fromDir, level - 1)
    const found = base === null ? null : resolveUnderRoot(module, imported, base, files, bindsName)
    return found === null ? { kind: "external", module } : { kind: "file", path: found }
  }

  for (const root of roots) {
    const found = resolveUnderRoot(module, imported, root, files, bindsName)
    if (found !== null) return { kind: "file", path: found }
  }

  if (packages !== null && module !== "") {
    const firstSegment = module.split(".")[0] ?? ""
    const entry = packages.get(firstSegment)
    if (entry !== undefined) {
      const found = resolveUnderRoot(module, imported, entry.dir, files, bindsName)
      if (found !== null) return { kind: "file", path: found }
    }
  }

  return { kind: "external", module }
}
