import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { expect } from "vitest"
import {
  storeCodeWalkthrough,
  storeJourneyFlowDiagram,
  type Codegraph,
  type CodegraphSegment,
  type StoredCodeWalkthrough,
  type StoredJourneyFlowDiagram,
} from "@flightplan/codegraph"
import { assembleGitAdapter } from "@flightplan/git-forge"
import { CASE_REF } from "./case-adapter"
import { NOTHING_WRITTEN, readWrittenParts, withWrittenParts, writtenContextAt, type WrittenParts } from "./written-parts"

const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const SUITE_SEPARATOR = " > "
const WORD_SEPARATOR = "-"
const UNSAFE_CHARACTERS_PATTERN = /[^a-z0-9]+/g
const EDGE_SEPARATORS_PATTERN = /^-+|-+$/g
const JSON_INDENT = 2
const LINE_BREAK = "\n"
const MISSING_FILE_CODE = "ENOENT"

export const caseTitleOf = (testName: string): string => {
  const names = testName.split(SUITE_SEPARATOR)
  return names[names.length - 1] ?? testName
}

export const snapshotNameOf = (testName: string): string =>
  caseTitleOf(testName).toLowerCase().replace(UNSAFE_CHARACTERS_PATTERN, WORD_SEPARATOR).replace(EDGE_SEPARATORS_PATTERN, "")

export const snapshotPathOf = (testPath: string, testName: string): string =>
  join(dirname(testPath), SNAPSHOT_FOLDER, `${snapshotNameOf(testName)}${SNAPSHOT_SUFFIX}`)

const withMapsAsRecords = (_key: string, value: unknown): unknown =>
  value instanceof Map ? Object.fromEntries(value) : value

export interface StoredCodegraphSegment extends Omit<CodegraphSegment, "journeyFlowDiagram" | "codeWalkthrough"> {
  readonly context: readonly string[]
  readonly journeyFlowDiagram: StoredJourneyFlowDiagram | null
  readonly codeWalkthrough: StoredCodeWalkthrough
}

export interface StoredCodegraph {
  readonly segments: readonly StoredCodegraphSegment[]
}

export interface CaseSnapshot {
  readonly title: string
  readonly diff: readonly string[]
  readonly codegraph: StoredCodegraph
}

export const storeCodegraph = ({ segments }: Codegraph, written: WrittenParts): StoredCodegraph => ({
  segments: segments.map(({ title, ...segment }, position) => ({
    title,
    context: writtenContextAt(written, position),
    ...segment,
    journeyFlowDiagram: segment.journeyFlowDiagram === null ? null : storeJourneyFlowDiagram(segment.journeyFlowDiagram),
    codeWalkthrough: storeCodeWalkthrough(segment.codeWalkthrough),
  })),
})

export interface CaseChange {
  readonly title: string
  readonly diff: string
}

export const caseSnapshotOf = ({ title, diff }: CaseChange, codegraph: Codegraph, written: WrittenParts): CaseSnapshot => ({
  title,
  diff: diff.split(LINE_BREAK),
  codegraph: storeCodegraph(withWrittenParts(codegraph, written), written),
})

const CASE_REPOSITORY = { id: "git", root: "", secret: null, username: "", baseUrl: "" } as const

const readCaseDiff = async (): Promise<string> => {
  const resolved = await assembleGitAdapter(CASE_REPOSITORY)
  if (!resolved.ok) throw resolved.error
  return await resolved.gitAdapter.diff(CASE_REF)
}

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

export const readStoredWrittenParts = async (snapshotPath: string): Promise<WrittenParts> => {
  const text = await readSnapshotText(snapshotPath)
  return text === null ? NOTHING_WRITTEN : readWrittenParts(parseJson(text))
}

export const serializeCase = (value: unknown): string => JSON.stringify(value, withMapsAsRecords, JSON_INDENT)

export const expectCaseSnapshot = async (codegraph: Codegraph): Promise<void> => {
  const { testPath, currentTestName } = expect.getState()
  if (testPath === undefined || currentTestName === undefined) {
    throw new Error("expectCaseSnapshot only works inside a test.")
  }
  const snapshotPath = snapshotPathOf(testPath, currentTestName)
  const change: CaseChange = { title: caseTitleOf(currentTestName), diff: await readCaseDiff() }
  const written = await readStoredWrittenParts(snapshotPath)
  await expect(`${serializeCase(caseSnapshotOf(change, codegraph, written))}${LINE_BREAK}`).toMatchFileSnapshot(snapshotPath)
}
