import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { stringify } from "devalue"
import {
  getAllFixtureCases,
  getAllReviewArtifactFixturesByCase,
  getFixtureRepository,
  getReviewArtifactFixture,
} from "@flightplan/playground-fixtures"

const DEMO_CASE_PREFIX = "demo-"
const STORY_FILE = "demo.json"
const META_FILE = "meta.json"
const INDEX_FILE = "index.json"
const NO_STORY = null

const SCRIPT_ARGUMENTS_START = 2
const INDEX_INDENT = 2

const [testCasesPath, outputPath] = process.argv.slice(SCRIPT_ARGUMENTS_START)

const isDemoCase = (caseName: string): boolean => caseName.startsWith(DEMO_CASE_PREFIX)

const readCaseJson = async (caseName: string, fileName: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(join(testCasesPath, caseName, fileName), "utf8"))
  } catch {
    return NO_STORY
  }
}

const readDemo = async (caseName: string) => {
  const [repository, fixtureNames, story] = await Promise.all([
    getFixtureRepository(testCasesPath, caseName),
    getAllReviewArtifactFixturesByCase(testCasesPath, caseName),
    readCaseJson(caseName, STORY_FILE),
  ])
  const artifacts = await Promise.all(fixtureNames.map(async (fixtureName) => await getReviewArtifactFixture(testCasesPath, fixtureName)))
  return {
    name: caseName,
    targets: repository.targets.map((target, index) => ({ ...target, artifact: artifacts[index] })),
    story,
  }
}

const writeDemo = async (caseName: string) => {
  const [demo, meta] = await Promise.all([readDemo(caseName), readCaseJson(caseName, META_FILE)])
  await writeFile(join(outputPath, `${caseName}.json`), stringify(demo))
  return { name: caseName, meta, pullRequestTitle: demo.targets[0]?.title ?? null, story: demo.story }
}

const writeDemos = async (): Promise<readonly string[]> => {
  await mkdir(outputPath, { recursive: true })
  const caseNames = (await getAllFixtureCases(testCasesPath)).filter(isDemoCase)
  const entries = await Promise.all(caseNames.map(writeDemo))
  await writeFile(join(outputPath, INDEX_FILE), JSON.stringify(entries, null, INDEX_INDENT))
  return caseNames
}

const written = await writeDemos()
console.log(`Wrote the demo data of ${written.join(", ")}`)
