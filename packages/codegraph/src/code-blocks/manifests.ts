export interface PackageManifest {
  readonly folder: string
  readonly packages: readonly string[]
}

export interface FileManifest {
  readonly packages: readonly string[]
  readonly packagePath: string
}

interface WrittenManifest {
  readonly dependencies?: unknown
  readonly devDependencies?: unknown
  readonly peerDependencies?: unknown
  readonly optionalDependencies?: unknown
}

const FOLDER_SEPARATOR = "/"
const ROOT_FOLDER = ""
const JAVASCRIPT_MANIFEST = "package.json"
const REQUIREMENT_PATTERN = /^\s*(?<name>[A-Za-z0-9][A-Za-z0-9._-]*)/
const QUOTED_REQUIREMENT_PATTERN = /["'](?<name>[A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(?:[<>=!~;@][^"']*)?["']/g
const PYTHON_MANIFEST_PATTERN = /(?:^|\/)(?:requirements[^/]*\.txt|pyproject\.toml)$/
const QUOTED_MANIFEST_SUFFIX = ".toml"
const LINE_BREAK = "\n"
const WORD_BREAK_PATTERN = /[-.]/g

const fileNameOf = (filePath: string): string => filePath.slice(filePath.lastIndexOf(FOLDER_SEPARATOR) + 1)

const folderOf = (filePath: string): string => (filePath.includes(FOLDER_SEPARATOR) ? filePath.slice(0, filePath.lastIndexOf(FOLDER_SEPARATOR)) : ROOT_FOLDER)

export const isManifestPath = (filePath: string): boolean => fileNameOf(filePath) === JAVASCRIPT_MANIFEST || PYTHON_MANIFEST_PATTERN.test(filePath)

const namesIn = (dependencies: unknown): string[] => (typeof dependencies === "object" && dependencies !== null ? Object.keys(dependencies) : [])

const parseManifest = (text: string): WrittenManifest => {
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

const javascriptPackagesOf = (text: string): string[] => {
  const { dependencies, devDependencies, peerDependencies, optionalDependencies } = parseManifest(text)
  return [dependencies, devDependencies, peerDependencies, optionalDependencies].flatMap(namesIn)
}

const moduleNameOf = (requirement: string): string => requirement.toLowerCase().replace(WORD_BREAK_PATTERN, "_")

const pythonPackagesOf = (manifestPath: string, text: string): string[] => {
  const names = manifestPath.endsWith(QUOTED_MANIFEST_SUFFIX)
    ? [...text.matchAll(QUOTED_REQUIREMENT_PATTERN)].map((match) => match.groups?.name ?? "")
    : text.split(LINE_BREAK).flatMap((line) => REQUIREMENT_PATTERN.exec(line)?.groups?.name ?? [])
  return names.map(moduleNameOf)
}

export const readManifest = (manifestPath: string, text: string): PackageManifest => ({
  folder: folderOf(manifestPath),
  packages: fileNameOf(manifestPath) === JAVASCRIPT_MANIFEST ? javascriptPackagesOf(text) : pythonPackagesOf(manifestPath, text),
})

const holds = ({ folder }: PackageManifest, filePath: string): boolean => folder === ROOT_FOLDER || filePath.startsWith(`${folder}${FOLDER_SEPARATOR}`)

const pathWithin = ({ folder }: PackageManifest, filePath: string): string => (folder === ROOT_FOLDER ? filePath : filePath.slice(folder.length + FOLDER_SEPARATOR.length))

export const findManifestOf = (filePath: string, manifests: readonly PackageManifest[]): FileManifest | null => {
  const holding = manifests.filter((manifest) => holds(manifest, filePath))
  if (holding.length === 0) return null
  const depth = Math.max(...holding.map((manifest) => manifest.folder.length))
  const nearest = holding.filter((manifest) => manifest.folder.length === depth)
  return { packages: [...new Set(nearest.flatMap((manifest) => manifest.packages))], packagePath: pathWithin(nearest[0], filePath) }
}
