import { join } from "node:path"
import { getAllFixtureCases, getAllReviewArtifactFixturesByCase } from "@/index"
import { readCodeGroupGraphs, storeCodeGroupGraph } from "@flightplan/codegraph"
import { BASE_COMMIT, HEAD_COMMIT } from "@test-setup/case-adapter"
import { listFixtureNames, setupFixtureChange } from "@test-setup/fixture-change"

const TEST_CASES_PATH = join(import.meta.dirname, "..", "..", "test-cases")
const NAME_SEPARATOR = "/"
const SNAPSHOT_FOLDER = "code-blocks"
const SNAPSHOT_SUFFIX = ".code-blocks.json"
const JSON_INDENT = 2
const LINE_BREAK = "\n"

const snapshotPathOf = (fixtureName: string): string => {
  const [caseName, snapshotName] = fixtureName.split(NAME_SEPARATOR)
  return join(TEST_CASES_PATH, caseName, SNAPSHOT_FOLDER, `${snapshotName}${SNAPSHOT_SUFFIX}`)
}

const FIXTURE_NAMES = await listFixtureNames(TEST_CASES_PATH, getAllFixtureCases, getAllReviewArtifactFixturesByCase)

describe("the stored form of the code block groups of every case", () => {
  it.each(FIXTURE_NAMES)("builds the groups of %s as its committed snapshot holds them", async (fixtureName) => {
    const gitAdapter = await setupFixtureChange(TEST_CASES_PATH, fixtureName)

    const groups = await readCodeGroupGraphs({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })

    await expect(`${JSON.stringify(groups.map(storeCodeGroupGraph), null, JSON_INDENT)}${LINE_BREAK}`).toMatchFileSnapshot(snapshotPathOf(fixtureName))
  })
})
