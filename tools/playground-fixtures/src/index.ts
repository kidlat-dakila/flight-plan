import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const TEST_CASES_PATH = fileURLToPath(new URL("../test-cases", import.meta.url))
const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const NAME_SEPARATOR = "/"
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/
const MISSING_FILE_CODE = "ENOENT"

const reviewArtifactFixtureSchema = z.looseObject({
  title: z.string(),
  context: z.array(z.string()),
  diff: z.array(z.string()),
  codegraph: z.unknown(),
})

export type ReviewArtifactFixture = z.infer<typeof reviewArtifactFixtureSchema>

export class UnknownFixtureError extends Error {
  public constructor(fixtureName: string) {
    super(`No test case has a review artifact fixture named ${fixtureName}.`)
    this.name = "UnknownFixtureError"
  }
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

const inOrder = (names: readonly string[]): string[] => [...names].sort((one, two) => (one < two ? -1 : Number(one > two)))

const listSnapshotFiles = async (caseName: string): Promise<string[]> => {
  try {
    return await readdir(join(TEST_CASES_PATH, caseName, SNAPSHOT_FOLDER))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

const readFixtureText = async (fixtureName: string): Promise<string> => {
  const [caseName, snapshotName] = fixtureName.split(NAME_SEPARATOR)
  try {
    return await readFile(join(TEST_CASES_PATH, caseName, SNAPSHOT_FOLDER, `${snapshotName}${SNAPSHOT_SUFFIX}`), "utf8")
  } catch (error) {
    if (isMissingFile(error)) throw new UnknownFixtureError(fixtureName)
    throw error
  }
}

export const getAllFixtureCases = async (): Promise<string[]> => {
  const entries = await readdir(TEST_CASES_PATH, { withFileTypes: true })
  return inOrder(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
}

export const getAllReviewArtifactFixturesByCase = async (caseName: string): Promise<string[]> => {
  const fileNames = await listSnapshotFiles(caseName)
  return inOrder(
    fileNames
      .filter((fileName) => fileName.endsWith(SNAPSHOT_SUFFIX))
      .map((fileName) => `${caseName}${NAME_SEPARATOR}${fileName.slice(0, -SNAPSHOT_SUFFIX.length)}`),
  )
}

export const getReviewArtifactFixture = async (fixtureName: string): Promise<ReviewArtifactFixture> => {
  if (!NAME_PATTERN.test(fixtureName)) throw new UnknownFixtureError(fixtureName)
  const parsed: unknown = JSON.parse(await readFixtureText(fixtureName))
  return reviewArtifactFixtureSchema.parse(parsed)
}
