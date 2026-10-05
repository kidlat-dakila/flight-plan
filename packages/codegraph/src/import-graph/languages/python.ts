import * as path from "node:path"
import { Memo, once } from "@/core/memo"
import { pythonPackages, rootsFinder } from "@/core/tracer/python/module-roots"
import { resolveModule } from "@/core/tracer/python/resolve"
import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"
import { sortedPaths } from "@/import-graph/sorted-paths"
import type { ImportLanguage, ImportReader } from "./language"
import { importerPatterns } from "./python-importer-patterns"
import { readPythonImports } from "./python-specifiers"

const EXTENSIONS = [".py", ".pyi"]
const PROJECT_FILES: ReadonlySet<string> = new Set(["pyproject.toml", "setup.cfg", "setup.py"])

const createImportReader = (snapshot: RepositorySnapshot): ImportReader => {
  const rootsFor = rootsFinder(snapshot.files, snapshot.read)
  const projectFiles = [...snapshot.files].filter((filePath) => PROJECT_FILES.has(path.posix.basename(filePath)))
  const packages = once(async () => {
    await snapshot.preload(projectFiles)
    return await pythonPackages(snapshot.files, snapshot.read)
  })
  const imports = new Memo<string, Promise<readonly string[]>>()

  const readImportsOf = async (filePath: string): Promise<readonly string[]> => {
    const [text, knownPackages] = await Promise.all([snapshot.read(filePath), packages()])
    if (text === null) return []
    const roots = await rootsFor(filePath)
    const imported = readPythonImports(text).flatMap(({ module, level, imported: name }) => {
      const resolved = resolveModule(filePath, module, level, name, snapshot.files, roots, knownPackages)
      return resolved.kind === "file" && resolved.path !== filePath ? [resolved.path] : []
    })
    return sortedPaths(imported)
  }

  return {
    importsOf: async (filePath) => await imports.remember(filePath, async () => await readImportsOf(filePath)),
    importerPatternsOf: async (filePaths) => await Promise.resolve(importerPatterns(filePaths)),
  }
}

export const pythonImportLanguage: ImportLanguage = {
  id: "python",
  extensions: EXTENSIONS,
  createImportReader,
}
