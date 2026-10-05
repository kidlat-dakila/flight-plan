import type { RepositorySnapshot } from "@/import-graph/repository-snapshot"

export interface ImportReader {
  readonly importsOf: (filePath: string) => Promise<readonly string[]>
  readonly importerPatternsOf: (filePaths: readonly string[]) => Promise<readonly string[]>
}

export interface ImportLanguage {
  readonly id: string
  readonly extensions: readonly string[]
  readonly createImportReader: (snapshot: RepositorySnapshot) => ImportReader
}

export const hasExtension = (filePath: string, extensions: readonly string[]): boolean => {
  const lowered = filePath.toLowerCase()
  return extensions.some((extension) => lowered.endsWith(extension))
}
