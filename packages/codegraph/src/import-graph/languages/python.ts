import { Memo, once } from "@/core/memo"
import { withTree } from "@/core/tracer/parse"
import { importBindingsOf, type PyImport } from "@/core/tracer/python/imports"
import { pythonPackages, rootsFinder } from "@/core/tracer/python/module-roots"
import { resolveModule } from "@/core/tracer/python/resolve"
import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"
import { sortedPaths } from "@/import-graph/sorted-paths"
import type { ImportLanguage, ImportReader } from "./language"
import { importerPatterns } from "./python-importer-patterns"

const EXTENSIONS = [".py", ".pyi"]
const NO_IMPORTS: PyImport[] = []

const createImportReader = (snapshot: RepositorySnapshot): ImportReader => {
  const rootsFor = rootsFinder(snapshot.files, snapshot.read)
  const packages = once(async () => await pythonPackages(snapshot.files, snapshot.read))
  const imports = new Memo<string, Promise<readonly string[]>>()

  const readImportsOf = async (filePath: string): Promise<readonly string[]> => {
    const text = await snapshot.read(filePath)
    if (text === null) return []
    const [bindings, roots, knownPackages] = await Promise.all([
      withTree(filePath, text, importBindingsOf, NO_IMPORTS),
      rootsFor(filePath),
      packages(),
    ])
    const imported = bindings.flatMap(({ module, level, imported: name }) => {
      const resolved = resolveModule(filePath, module, level, name, snapshot.files, roots, knownPackages)
      return resolved.kind === "file" && resolved.path !== filePath ? [resolved.path] : []
    })
    return sortedPaths(imported)
  }

  return {
    importsOf: async (filePath) => await imports.remember(filePath, async () => await readImportsOf(filePath)),
    importerPatternsOf: async (filePath) => await Promise.resolve(importerPatterns(filePath)),
  }
}

export const pythonImportLanguage: ImportLanguage = {
  id: "python",
  extensions: EXTENSIONS,
  createImportReader,
}
