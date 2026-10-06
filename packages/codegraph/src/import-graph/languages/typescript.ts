import * as path from "node:path"
import * as jsonc from "jsonc-parser"
import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"
import { sortedPaths } from "@/import-graph/sorted-paths"
import { Memo, once } from "@/shared/memo"
import { recordOf } from "@/shared/record"
import { hasExtension, type ImportLanguage, type ImportReader } from "./language"
import { importerPatterns, type PathAlias } from "./typescript-importer-patterns"
import { moduleResolver } from "./typescript-resolve"
import { readImportSpecifiers } from "./typescript-specifiers"

const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".vue"]
const PACKAGE_MANIFEST = "package.json"
const COMPILER_CONFIG_PATTERN = /(^|\/)(tsconfig|jsconfig)[^/]*\.json$/
const WILDCARD = "*"
const ROOT_DIRECTORY = "."

interface Package {
  readonly directory: string
  readonly name: string | null
}

const recordIn = (text: string | null): Record<string, unknown> | null => {
  if (text === null) return null
  const parsed: unknown = jsonc.parse(text)
  return recordOf(parsed)
}

const manifestIn = (directory: string): string =>
  directory === ROOT_DIRECTORY ? PACKAGE_MANIFEST : `${directory}/${PACKAGE_MANIFEST}`

const packageDirectoryOf = (directory: string, files: ReadonlySet<string>): string | null => {
  if (files.has(manifestIn(directory))) return directory
  return directory === ROOT_DIRECTORY ? null : packageDirectoryOf(path.posix.dirname(directory), files)
}

const readPackageOf = async (filePath: string, snapshot: RepositorySnapshot): Promise<Package | null> => {
  const directory = packageDirectoryOf(path.posix.dirname(filePath), snapshot.files)
  if (directory === null) return null
  const name = recordIn(await snapshot.read(manifestIn(directory)))?.name
  return { directory, name: typeof name === "string" && name !== "" ? name : null }
}

const stringsIn = (targets: unknown): string[] =>
  Array.isArray(targets) ? targets.filter((target): target is string => typeof target === "string") : []

const pathAliasesIn = (config: Record<string, unknown> | null): PathAlias[] => {
  const paths = recordOf(recordOf(config?.compilerOptions)?.paths)
  if (paths === null) return []
  return Object.entries(paths)
    .filter(([name]) => !name.includes(WILDCARD))
    .map(([name, targets]) => ({ name, targets: stringsIn(targets) }))
}

const readPathAliases = async (snapshot: RepositorySnapshot): Promise<PathAlias[]> => {
  const configs = [...snapshot.files].filter((filePath) => COMPILER_CONFIG_PATTERN.test(filePath))
  const aliases = await Promise.all(configs.map(async (config) => pathAliasesIn(recordIn(await snapshot.read(config)))))
  return aliases.flat()
}

const createImportReader = (snapshot: RepositorySnapshot): ImportReader => {
  const resolve = moduleResolver(snapshot.files, snapshot.read)
  const importedFilePaths = new Memo<string, Promise<ReadonlyMap<string, string>>>()
  const configFiles = [...snapshot.files].filter(
    (filePath) => path.posix.basename(filePath) === PACKAGE_MANIFEST || COMPILER_CONFIG_PATTERN.test(filePath),
  )
  const preloadConfigFiles = once(async () => {
    await snapshot.preload(configFiles)
  })
  const pathAliases = once(async () => {
    await preloadConfigFiles()
    return await readPathAliases(snapshot)
  })

  const readImportedFilePathsOf = async (filePath: string): Promise<ReadonlyMap<string, string>> => {
    const [text] = await Promise.all([snapshot.read(filePath), preloadConfigFiles()])
    if (text === null) return new Map()
    const specifiers = readImportSpecifiers(filePath, text)
    const resolved = await Promise.all(specifiers.map(async (specifier) => await resolve(filePath, specifier)))
    return new Map(
      specifiers.flatMap((specifier, index) => {
        const found = resolved[index]
        return found !== null && found !== filePath && hasExtension(found, EXTENSIONS) ? [[specifier, found] as const] : []
      }),
    )
  }

  const importedFilePathsOf = async (filePath: string): Promise<ReadonlyMap<string, string>> =>
    await importedFilePaths.remember(filePath, async () => await readImportedFilePathsOf(filePath))

  return {
    importsOf: async (filePath) => sortedPaths([...(await importedFilePathsOf(filePath)).values()]),
    importedFilePathsOf,
    importerPatternsOf: async (filePaths) => {
      const aliases = await pathAliases()
      const imported = await Promise.all(
        filePaths.map(async (filePath) => {
          const containingPackage = await readPackageOf(filePath, snapshot)
          return {
            filePath,
            packageDirectory: containingPackage?.directory ?? null,
            packageName: containingPackage?.name ?? null,
            pathAliases: aliases,
          }
        }),
      )
      return importerPatterns(imported)
    },
  }
}

export const typescriptImportLanguage: ImportLanguage = {
  id: "typescript",
  extensions: EXTENSIONS,
  createImportReader,
}
