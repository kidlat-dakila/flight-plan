import * as path from "node:path"
import { parse as parseToml } from "smol-toml"
import { Memo } from "@/shared/memo"
import { recordOf } from "@/shared/record"
import { mapInSequence } from "@/shared/sequence"

type Read = (path: string) => Promise<string | null>

export interface PyPackageEntry { dir: string, topLevel: string }

export type PyPackages = ReadonlyMap<string, PyPackageEntry>

const MARKERS = ["pyproject.toml", "setup.cfg", "setup.py"] as const

type Marker = (typeof MARKERS)[number]

const SECTION = /^\s*\[([^\]]+)\]\s*$/
const PACKAGE_DIR = /^\s*package_dir\s*=\s*(.*)$/
const ROOT_MAPPING = /^["']?["']?\s*=\s*["']?([^"'\s]+)["']?$/
const INDENTED = /^\s+/
const PACKAGE_INIT = /^([^/]+)\/__init__\.py$/
const MODULE_EXTENSION = ".py"

const isMarker = (name: string): name is Marker => MARKERS.some((marker) => marker === name)

const isSrc = (value: unknown): boolean => typeof value === "string" && value.replace(/\/+$/, "") === "src"

function join(dir: string, sub: string): string {
  const joined = dir === "" ? sub : path.posix.normalize(path.posix.join(dir, sub))
  return joined === "." ? "" : joined
}

function parsedToml(text: string): unknown {
  try {
    return parseToml(text)
  } catch {
    return null
  }
}

function pyprojectIsSrcLayout(text: string): boolean {
  const tool = recordOf(recordOf(parsedToml(text))?.tool)
  if (tool === null) return false
  const packageDir = recordOf(recordOf(tool.setuptools)?.["package-dir"])
  if (packageDir !== null && isSrc(packageDir[""])) return true
  const packages = recordOf(tool.poetry)?.packages
  return Array.isArray(packages) && packages.some((entry: unknown) => isSrc(recordOf(entry)?.from))
}

function isInOptions(lines: readonly string[], index: number): boolean {
  const headers = lines.slice(0, index).flatMap((line) => {
    const header = SECTION.exec(line)
    return header === null ? [] : [header[1].trim().toLowerCase()]
  })
  return headers.length > 0 && headers[headers.length - 1] === "options"
}

function continuedValues(following: readonly string[]): string[] {
  const stop = following.findIndex((next) => next.trim() !== "" && !INDENTED.test(next))
  const continued = stop === -1 ? following : following.slice(0, stop)
  return continued.map((next) => next.trim()).filter((next) => next !== "")
}

function setupCfgIsSrcLayout(text: string): boolean {
  const lines = text.split(/\r?\n/)
  const at = lines.findIndex((line, index) => !SECTION.test(line) && PACKAGE_DIR.test(line) && isInOptions(lines, index))
  const key = at === -1 ? null : PACKAGE_DIR.exec(lines[at])
  if (key === null) return false
  const inline = key[1].trim()
  const values = [...(inline === "" ? [] : [inline]), ...continuedValues(lines.slice(at + 1))]
  return values.some((value) => {
    const mapping = ROOT_MAPPING.exec(value)
    return mapping !== null && isSrc(mapping[1])
  })
}

function setupPyIsSrcLayout(text: string): boolean {
  return (
    /package_dir\s*=\s*\{\s*["']{2}\s*:\s*["']src["']\s*\}/.test(text)
    || /where\s*=\s*["']src["']/.test(text)
  )
}

const SRC_LAYOUT_CHECK: Record<Marker, (text: string) => boolean> = {
  "pyproject.toml": pyprojectIsSrcLayout,
  "setup.cfg": setupCfgIsSrcLayout,
  "setup.py": setupPyIsSrcLayout,
}

function rootOf(dir: string, marker: Marker, text: string): string {
  return SRC_LAYOUT_CHECK[marker](text) ? join(dir, "src") : dir
}

function nearestMarker(directory: string, files: ReadonlySet<string>): { dir: string, marker: Marker } | null {
  const marker = MARKERS.find((one) => files.has(directory === "" ? one : `${directory}/${one}`))
  if (marker !== undefined) return { dir: directory, marker }
  if (directory === "") return null
  const parent = path.posix.dirname(directory)
  return nearestMarker(parent === directory ? "" : parent, files)
}

function ancestorSrcDirs(directory: string): string[] {
  const own = path.posix.basename(directory) === "src" ? [directory] : []
  const parent = path.posix.dirname(directory)
  return directory === "" || parent === directory ? own : [...own, ...ancestorSrcDirs(parent)]
}

export function rootsFinder(files: ReadonlySet<string>, read: Read): (fromFile: string) => Promise<string[]> {
  const byDirectory = new Memo<string, Promise<string[]>>()

  const rootsOf = async (directory: string): Promise<string[]> => {
    const found = nearestMarker(directory, files)
    const text = found === null ? null : await read(found.dir === "" ? found.marker : `${found.dir}/${found.marker}`)
    if (found === null || text === null) return [...new Set([...ancestorSrcDirs(directory), ""])]
    const root = rootOf(found.dir, found.marker, text)
    return root === "" ? [root] : [root, ""]
  }

  return async (fromFile) => {
    const directory = path.posix.dirname(fromFile)
    const normalisedDirectory = directory === "." ? "" : directory
    return byDirectory.remember(normalisedDirectory, async () => rootsOf(normalisedDirectory))
  }
}

function topLevelNameOf(rest: string): string[] {
  const packageInit = PACKAGE_INIT.exec(rest)
  if (packageInit !== null) return [packageInit[1]]
  const isModule = !rest.includes("/") && rest.endsWith(MODULE_EXTENSION) && rest !== "__init__.py"
  return isModule ? [rest.slice(0, -MODULE_EXTENSION.length)] : []
}

function topLevelNamesOf(root: string, files: ReadonlySet<string>): string[] {
  const prefix = root === "" ? "" : `${root}/`
  const names = [...files].filter((file) => file.startsWith(prefix)).flatMap((file) => topLevelNameOf(file.slice(prefix.length)))
  return [...new Set(names)]
}

export async function pythonPackages(files: ReadonlySet<string>, read: Read): Promise<PyPackages> {
  const markerFiles = [...files].flatMap((file) => {
    const base = path.posix.basename(file)
    return isMarker(base) ? [{ file, marker: base }] : []
  })
  const found = await mapInSequence(markerFiles, async ({ file, marker }) => {
    const dir = path.posix.dirname(file)
    const text = await read(file)
    return text === null ? [] : [rootOf(dir === "." ? "" : dir, marker, text)]
  })
  const roots = [...new Set(found.flat())]
  return (roots.length === 0 ? [""] : roots)
    .flatMap((root) => topLevelNamesOf(root, files).map((topLevel) => ({ dir: root, topLevel })))
    .reduce<Map<string, PyPackageEntry>>(
      (held, entry) => (held.has(entry.topLevel) ? held : new Map(held).set(entry.topLevel, entry)),
      new Map(),
    )
}
