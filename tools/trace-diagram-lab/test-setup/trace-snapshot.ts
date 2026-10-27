import { readFile } from "node:fs/promises"
import { expect } from "vitest"
import { toReviewSnapshot, traceSnapshotSchema, type TracedWaypoint, type TraceSegment, type TraceSnapshot } from "@/fixtures/trace-snapshot"
import type { Codegraph, StoredLinkedWaypoint } from "@flightplan/codegraph"
import {
  caseSnapshotOf,
  caseTitleOf,
  NOTHING_WRITTEN,
  readCaseDiff,
  readWrittenParts,
  serializeCase,
  snapshotPathOf,
  type CaseChange,
  type CaseSnapshot,
  type StoredCodegraphSegment,
  type WrittenParts,
} from "@flightplan/playground-fixtures/test-setup"

const LINE_BREAK = "\n"
const MISSING_FILE_CODE = "ENOENT"

const trimWaypoint = ({ id, declaration, range, codeBlockIds, children }: StoredLinkedWaypoint): TracedWaypoint => ({
  id,
  declaration,
  range,
  codeBlockIds,
  children: children.map(trimWaypoint),
})

const trimSegment = ({ title, importGraph, traceDiagram, codeWalkthrough, codeReferences }: StoredCodegraphSegment): TraceSegment => ({
  title,
  importGraph,
  traceDiagram,
  codeWalkthrough: { files: codeWalkthrough.files.map(({ path, waypoints }) => ({ path, waypoints: waypoints.map(trimWaypoint) })) },
  codeReferences,
})

export const trimCaseSnapshot = ({ title, diff, codegraph }: CaseSnapshot): TraceSnapshot => ({
  title,
  diff,
  codegraph: { segments: codegraph.segments.map(trimSegment) },
})

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

const readSnapshotText = async (snapshotPath: string): Promise<string | null> => {
  try {
    return await readFile(snapshotPath, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const readTraceWrittenParts = async (snapshotPath: string): Promise<WrittenParts> => {
  const text = await readSnapshotText(snapshotPath)
  const snapshot = text === null ? null : traceSnapshotSchema.safeParse(parseJson(text))
  return snapshot?.success === true ? readWrittenParts(toReviewSnapshot(snapshot.data)) : NOTHING_WRITTEN
}

export const expectTraceSnapshot = async (codegraph: Codegraph): Promise<void> => {
  const { testPath, currentTestName } = expect.getState()
  if (testPath === undefined || currentTestName === undefined) {
    throw new Error("expectTraceSnapshot only works inside a test.")
  }
  const snapshotPath = snapshotPathOf(testPath, currentTestName)
  const change: CaseChange = { title: caseTitleOf(currentTestName), diff: await readCaseDiff() }
  const written = await readTraceWrittenParts(snapshotPath)
  const snapshot = trimCaseSnapshot(caseSnapshotOf(change, codegraph, written))
  await expect(`${serializeCase(snapshot)}${LINE_BREAK}`).toMatchFileSnapshot(snapshotPath)
}
