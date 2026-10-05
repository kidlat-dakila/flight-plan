import * as path from "node:path"
import { Memo, once } from "@/core/memo"
import { pythonPackages, rootsFinder } from "@/core/tracer/python/module-roots"
import { resolveModule } from "@/core/tracer/python/resolve"
import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"
import { sortedPaths } from "@/import-graph/sorted-paths"
import type { ImportLanguage, ImportReader } from "./language"
import { importerPatterns } from "./python-importer-patterns"
import { pythonSpecifierOf, readPythonImports } from "./python-specifiers"

const EXTENSIONS = [".py", ".pyi"]
const PROJECT_FILES: ReadonlySet<string> = new Set(["pyproject.toml", "setup.cfg", "setup.py"])

const createImportReader = (snapshot: RepositorySnapshot): ImportReader => {
  const rootsFor = rootsFinder(snapshot.files, snapshot.read)
  const projectFiles = [...snapshot.files].filter((filePath) => PROJECT_FILES.has(path.posix.basename(filePath)))
  const packages = once(async () => {
    await snapshot.preload(projectFiles)
    return await pythonPackages(snapshot.files, snapshot.read)
  })
  const importedFilePaths = new Memo<string, Promise<ReadonlyMap<string, string>>>()

  const readImportedFilePathsOf = async (filePath: string): Promise<ReadonlyMap<string, string>> => {
    const [text, knownPackages] = await Promise.all([snapshot.read(filePath), packages()])
    if (text === null) return new Map()
    const roots = await rootsFor(filePath)
    return new Map(
      readPythonImports(text).flatMap((imported) => {
        const resolved = resolveModule(filePath, imported.module, imported.level, imported.imported, snapshot.files, roots, knownPackages)
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
