import type { DiffType } from "@/artifact/review-artifact"

export interface ImportGraphFile {
  readonly filePath: string
  readonly gitSha: string
  readonly diffType: DiffType | null
  readonly importedBy: readonly string[]
  readonly importsTo: readonly string[]
  readonly importedFilePaths: ReadonlyMap<string, string>
}

export type ImportGraphGroup = readonly ImportGraphFile[]
