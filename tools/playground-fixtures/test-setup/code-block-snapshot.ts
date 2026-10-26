import { join } from "node:path"
import { readCodeGroupGraphs, storeCodeGroupGraph } from "@flightplan/codegraph"
import { BASE_COMMIT, HEAD_COMMIT } from "./case-adapter"
import { setupFixtureChange } from "./fixture-change"

const NAME_SEPARATOR = "/"
const CODE_BLOCKS_FOLDER = "code-blocks"
const CODE_BLOCKS_SUFFIX = ".code-blocks.json"
const JSON_INDENT = 2
const LINE_BREAK = "\n"

export const codeBlocksPathOf = (testCasesPath: string, fixtureName: string): string => {
  const [caseName, snapshotName] = fixtureName.split(NAME_SEPARATOR)
  return join(testCasesPath, caseName, CODE_BLOCKS_FOLDER, `${snapshotName}${CODE_BLOCKS_SUFFIX}`)
}

export const storedCodeBlocksOf = async (testCasesPath: string, fixtureName: string): Promise<string> => {
  const gitAdapter = await setupFixtureChange(testCasesPath, fixtureName)
  const groups = await readCodeGroupGraphs({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return `${JSON.stringify(groups.map(storeCodeGroupGraph), null, JSON_INDENT)}${LINE_BREAK}`
}
