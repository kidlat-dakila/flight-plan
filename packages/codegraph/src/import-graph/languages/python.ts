import * as path from "node:path"
import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"
import { sortedPaths } from "@/import-graph/sorted-paths"
import { Memo, once } from "@/shared/memo"
import type { ImportLanguage, ImportReader } from "./language"
import { readModuleNames } from "./python-bindings"
import { importerPatterns, isPackageEntry } from "./python-importer-patterns"
import { pythonPackages, rootsFinder } from "./python-module-roots"
import { resolveModule, type BindsName } from "./python-resolve"
import { pythonSpecifierOf, readPythonImports, type PythonImport } from "./python-specifiers"

const EXTENSIONS = [".py", ".pyi"]
const PROJECT_FILES: ReadonlySet<string> = new Set(["pyproject.toml", "setup.cfg", "setup.py"])
const WILDCARD = "*"
const NO_NAMES: ReadonlySet<string> = new Set()

const isNamedImport = ({ imported }: PythonImport): boolean => imported !== "" && imported !== WILDCARD

const createImportReader = (snapshot: RepositorySnapshot): ImportReader => {
  const rootsFor = rootsFinder(snapshot.files, snapshot.read)
  const projectFiles = [...snapshot.files].filter((filePath) => PROJECT_FILES.has(path.posix.basename(filePath)))
  const packages = once(async () => {
    await snapshot.preload(projectFiles)
    return await pythonPackages(snapshot.files, snapshot.read)
  })
  const packageEntries = [...snapshot.files].filter(isPackageEntry)
  const preloadPackageEntries = once(async () => {
    await snapshot.preload(packageEntries)
  })
  const moduleNames = new Memo<string, Promise<ReadonlySet<string>>>()
  const importedFilePaths = new Memo<string, Promise<ReadonlyMap<string, string>>>()

  const moduleNamesOf = async (packageEntry: string): Promise<ReadonlySet<string>> =>
    await moduleNames.remember(packageEntry, async () => {
      const text = await snapshot.read(packageEntry)
      return text === null ? NO_NAMES : readModuleNames(text)
    })

  const readBindsName = async (importedPackages: readonly string[]): Promise<BindsName> => {
    if (importedPackages.length > 0) await preloadPackageEntries()
    const names = new Map(await Promise.all(importedPackages.map(async (entry) => [entry, await moduleNamesOf(entry)] as const)))
    return (packageEntry, name) => names.get(packageEntry)?.has(name) ?? false
  }

  const readImportedFilePathsOf = async (filePath: string): Promise<ReadonlyMap<string, string>> => {
    const [text, knownPackages] = await Promise.all([snapshot.read(filePath), packages()])
    if (text === null) return new Map()
    const roots = await rootsFor(filePath)
    const imports = readPythonImports(text)
    const resolve = (imported: PythonImport, bindsName?: BindsName) =>
      resolveModule(filePath, imported.module, imported.level, imported.imported, snapshot.files, roots, knownPackages, bindsName)
    const importedPackages = imports.filter(isNamedImport).flatMap((imported) => {
      const resolved = resolve({ ...imported, imported: "" })
      return resolved.kind === "file" && isPackageEntry(resolved.path) ? [resolved.path] : []
    })
    const bindsName = await readBindsName(sortedPaths(importedPackages))
    return new Map(
      imports.flatMap((imported) => {
        const resolved = resolve(imported, bindsName)
        return resolved.kind === "file" && resolved.path !== filePath ? [[pythonSpecifierOf(imported), resolved.path] as const] : []
      }),
    )
  }

  const importedFilePathsOf = async (filePath: string): Promise<ReadonlyMap<string, string>> =>
    await importedFilePaths.remember(filePath, async () => await readImportedFilePathsOf(filePath))

  return {
    importsOf: async (filePath) => sortedPaths([...(await importedFilePathsOf(filePath)).values()]),
    importedFilePathsOf,
    importerPatternsOf: async (filePaths) => await Promise.resolve(importerPatterns(filePaths)),
  }
}

export const pythonImportLanguage: ImportLanguage = {
  id: "python",
  extensions: EXTENSIONS,
  createImportReader,
}
