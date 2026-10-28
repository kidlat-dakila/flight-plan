import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ReviewArtifact } from "@flightplan/configurations"
import { applyDiffs, getAllReviewArtifactFixturesByCase, readRepositoryFiles, readStoredGroups, toReviewArtifact } from "@flightplan/playground-fixtures"
import { toCaseSnapshot, traceSnapshotSchema, type TraceSnapshot } from "./trace-snapshot"

const NAME_SEPARATOR = "/"
const REPOSITORY_FOLDER = "repo"
const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const CODE_BLOCKS_FOLDER = "code-blocks"
const CODE_BLOCKS_SUFFIX = ".code-blocks.json"
const MISSING_FILE_CODE = "ENOENT"
const LINE_BREAK = "\n"
const SEGMENTED_MINIMUM = 2

export const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

export const readTextOrNull = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

const snapshotNameOf = (fixtureName: string): string => fixtureName.split(NAME_SEPARATOR).at(-1) ?? fixtureName

export const listSnapshotNames = async (casesPath: string, kind: string): Promise<string[]> =>
  (await getAllReviewArtifactFixturesByCase(casesPath, kind)).map(snapshotNameOf)

const parseTraceSnapshot = (text: string): TraceSnapshot => {
  const parsed: unknown = JSON.parse(text)
  return traceSnapshotSchema.parse(parsed)
}

const snapshotPathOf = (casesPath: string, kind: string, name: string): string =>
  join(casesPath, kind, SNAPSHOT_FOLDER, `${name}${SNAPSHOT_SUFFIX}`)

const codeBlocksPathOf = (casesPath: string, kind: string, name: string): string =>
  join(casesPath, kind, CODE_BLOCKS_FOLDER, `${name}${CODE_BLOCKS_SUFFIX}`)

export const readTraceSnapshot = async (casesPath: string, kind: string, name: string): Promise<TraceSnapshot | null> => {
  const text = await readTextOrNull(snapshotPathOf(casesPath, kind, name))
  return text === null ? null : parseTraceSnapshot(text)
}

export const readCaseArtifact = async (casesPath: string, kind: string, name: string): Promise<ReviewArtifact | null> => {
  const snapshot = await readTraceSnapshot(casesPath, kind, name)
  if (snapshot === null) return null
  const codeBlocksText = await readFile(codeBlocksPathOf(casesPath, kind, name), "utf8")
  const baseFiles = await readRepositoryFiles(join(casesPath, kind, REPOSITORY_FOLDER))
  const headFiles = applyDiffs(baseFiles, [snapshot.diff.join(LINE_BREAK)])
  const isSegmented = snapshot.codegraph.segments.length >= SEGMENTED_MINIMUM
  return toReviewArtifact(toCaseSnapshot(snapshot), headFiles, readStoredGroups(codeBlocksText), isSegmented)
}
