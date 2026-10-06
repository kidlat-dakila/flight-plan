import { dirname, join } from "node:path"
import { expect } from "vitest"
import type { Codegraph } from "@flightplan/codegraph"
import { assembleGitAdapter } from "@flightplan/git-forge"
import { CASE_REF } from "./case-adapter"
import { labelCodegraph, type SegmentLabels } from "./case-labels"

const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const SUITE_SEPARATOR = " > "
const WORD_SEPARATOR = "-"
const UNSAFE_CHARACTERS_PATTERN = /[^a-z0-9]+/g
const EDGE_SEPARATORS_PATTERN = /^-+|-+$/g
const JSON_INDENT = 2
const LINE_BREAK = "\n"

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

export interface CaseResult {
  readonly context: string
  readonly codegraph: Codegraph
  readonly segments?: readonly SegmentLabels[]
}

export interface CaseSnapshot {
  readonly title: string
  readonly context: readonly string[]
  readonly diff: readonly string[]
  readonly codegraph: Codegraph
}

export interface CaseChange {
  readonly title: string
  readonly diff: string
}

export class MissingCaseContextError extends Error {
  constructor() {
    super("A case needs a context: say in Markdown what its diffs change.")
    this.name = "MissingCaseContextError"
  }
}

export const caseSnapshotOf = ({ title, diff }: CaseChange, { context, codegraph, segments }: CaseResult): CaseSnapshot => {
  const markdown = context.trim()
  if (markdown === "") throw new MissingCaseContextError()
  return {
    title,
    context: markdown.split(LINE_BREAK),
    diff: diff.split(LINE_BREAK),
    codegraph: labelCodegraph(codegraph, segments),
  }
}

const CASE_REPOSITORY = { id: "git", root: "", secret: null, username: "", baseUrl: "" } as const

const readCaseDiff = async (): Promise<string> => {
  const resolved = await assembleGitAdapter(CASE_REPOSITORY)
  if (!resolved.ok) throw resolved.error
  return await resolved.gitAdapter.diff(CASE_REF)
}

export const serializeCase = (value: unknown): string => JSON.stringify(value, withMapsAsRecords, JSON_INDENT)

export const expectCaseSnapshot = async (caseResult: CaseResult): Promise<void> => {
  const { testPath, currentTestName } = expect.getState()
  if (testPath === undefined || currentTestName === undefined) {
    throw new Error("expectCaseSnapshot only works inside a test.")
  }
  const change: CaseChange = { title: caseTitleOf(currentTestName), diff: await readCaseDiff() }
  await expect(`${serializeCase(caseSnapshotOf(change, caseResult))}${LINE_BREAK}`)
    .toMatchFileSnapshot(snapshotPathOf(testPath, currentTestName))
}
