import { applyPatch } from "diff"
import { splitDiff, type ChangedFile } from "@flightplan/git-forge"

export type RepositoryFiles = ReadonlyMap<string, string>

const REMOVED_STATUS = "removed"
const EMPTY_TEXT = ""
const LINE_BREAK = "\n"

export class UnreadableDiffError extends Error {
  public constructor() {
    super("A diff must open every file with a \"diff --git a/<path> b/<path>\" line.")
  }
}

export class DiffMismatchError extends Error {
  public constructor(path: string) {
    super(`The diff of ${path} does not apply to that file in the case repository.`)
  }
}

const changedFilesOf = (diff: string): readonly ChangedFile[] => {
  const files = splitDiff(diff)
  if (files.length === 0 && diff.trim() !== EMPTY_TEXT) throw new UnreadableDiffError()
  return files
}

const withoutFile = (files: RepositoryFiles, path: string): RepositoryFiles =>
  new Map([...files].filter(([filePath]) => filePath !== path))

const patchOf = (basePath: string, headPath: string, hunks: string): string =>
  [`--- a/${basePath}`, `+++ b/${headPath}`, hunks].join(LINE_BREAK)

const patched = (baseText: string, basePath: string, file: ChangedFile): string => {
  if (file.patch === undefined) return baseText
  const headText = applyPatch(baseText, patchOf(basePath, file.path, file.patch))
  if (headText === false) throw new DiffMismatchError(file.path)
  return headText
}

const withFileChanged = (files: RepositoryFiles, file: ChangedFile): RepositoryFiles => {
  const basePath = file.previousPath ?? file.path
  const kept = withoutFile(files, basePath)
  if (file.status === REMOVED_STATUS) return kept
  return new Map([...kept, [file.path, patched(files.get(basePath) ?? EMPTY_TEXT, basePath, file)]])
}

export const applyDiffs = (baseFiles: RepositoryFiles, diffs: readonly string[]): RepositoryFiles =>
  diffs.flatMap(changedFilesOf).reduce(withFileChanged, baseFiles)
