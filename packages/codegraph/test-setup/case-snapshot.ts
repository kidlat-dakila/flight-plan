import { dirname, join } from "node:path"
import { expect } from "vitest"

const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const SUITE_SEPARATOR = " > "
const WORD_SEPARATOR = "-"
const UNSAFE_CHARACTERS_PATTERN = /[^a-z0-9]+/g
const EDGE_SEPARATORS_PATTERN = /^-+|-+$/g
const JSON_INDENT = 2
const LINE_BREAK = "\n"

export const snapshotNameOf = (testName: string): string => {
  const names = testName.split(SUITE_SEPARATOR)
  const caseName = names[names.length - 1] ?? testName
  return caseName.toLowerCase().replace(UNSAFE_CHARACTERS_PATTERN, WORD_SEPARATOR).replace(EDGE_SEPARATORS_PATTERN, "")
}

export const snapshotPathOf = (testPath: string, testName: string): string =>
  join(dirname(testPath), SNAPSHOT_FOLDER, `${snapshotNameOf(testName)}${SNAPSHOT_SUFFIX}`)

export const expectCaseSnapshot = async (value: unknown): Promise<void> => {
  const { testPath, currentTestName } = expect.getState()
  if (testPath === undefined || currentTestName === undefined) {
    throw new Error("expectCaseSnapshot only works inside a test.")
  }
  await expect(`${JSON.stringify(value, null, JSON_INDENT)}${LINE_BREAK}`)
    .toMatchFileSnapshot(snapshotPathOf(testPath, currentTestName))
}
