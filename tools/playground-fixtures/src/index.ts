import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"

const SNAPSHOT_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const NAME_SEPARATOR = "/"
const CASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const FIXTURE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/
const MISSING_FILE_CODE = "ENOENT"
const MOCK_AUTHOR = "fixture-author"
const MOCK_UPDATED_AT = "2026-01-01T00:00:00.000Z"

const reviewArtifactFixtureSchema = z.looseObject({
  title: z.string(),
  context: z.array(z.string()),
  diff: z.array(z.string()),
  codegraph: z.unknown(),
})

export type ReviewArtifactFixture = z.infer<typeof reviewArtifactFixtureSchema>

export interface FixtureReviewTarget {
  readonly kind: "pull-request"
  readonly number: number
  readonly title: string
  readonly branch: string
  readonly author: string
  readonly authorAvatarUrl: null
  readonly branchStatus: "no-review"
  readonly isNew: false
  readonly updatedAt: Date
}

export interface FixtureRepository {
  readonly name: string
  readonly path: string
  readonly forge: "git"
  readonly forgeSlug: null
  readonly problem: null
  readonly hasFollowedAuthors: true
  readonly targets: readonly FixtureReviewTarget[]
}

export class UnknownFixtureCaseError extends Error {
  public constructor(caseName: string) {
    super(`No test case is named ${caseName}.`)
    this.name = "UnknownFixtureCaseError"
  }
}

export class UnknownFixtureError extends Error {
  public constructor(fixtureName: string) {
    super(`No test case has a review artifact fixture named ${fixtureName}.`)
    this.name = "UnknownFixtureError"
  }
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FILE_CODE

const inOrder = (names: readonly string[]): string[] => [...names].sort((one, two) => (one < two ? -1 : Number(one > two)))

const listSnapshotFiles = async (testCasesPath: string, caseName: string): Promise<string[]> => {
  try {
    return await readdir(join(testCasesPath, caseName, SNAPSHOT_FOLDER))
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
}

const readFixtureText = async (testCasesPath: string, fixtureName: string): Promise<string> => {
  const [caseName, snapshotName] = fixtureName.split(NAME_SEPARATOR)
  try {
    return await readFile(join(testCasesPath, caseName, SNAPSHOT_FOLDER, `${snapshotName}${SNAPSHOT_SUFFIX}`), "utf8")
  } catch (error) {
    if (isMissingFile(error)) throw new UnknownFixtureError(fixtureName)
    throw error
  }
}

export const getAllFixtureCases = async (testCasesPath: string): Promise<string[]> => {
  const entries = await readdir(testCasesPath, { withFileTypes: true })
  return inOrder(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
}

export const getAllReviewArtifactFixturesByCase = async (testCasesPath: string, caseName: string): Promise<string[]> => {
  const fileNames = await listSnapshotFiles(testCasesPath, caseName)
  return inOrder(
    fileNames
      .filter((fileName) => fileName.endsWith(SNAPSHOT_SUFFIX))
      .map((fileName) => `${caseName}${NAME_SEPARATOR}${fileName.slice(0, -SNAPSHOT_SUFFIX.length)}`),
  )
}

export const getReviewArtifactFixture = async (
  testCasesPath: string,
  fixtureName: string,
): Promise<ReviewArtifactFixture> => {
  if (!FIXTURE_NAME_PATTERN.test(fixtureName)) throw new UnknownFixtureError(fixtureName)
  const parsed: unknown = JSON.parse(await readFixtureText(testCasesPath, fixtureName))
  return reviewArtifactFixtureSchema.parse(parsed)
}

const snapshotNameOf = (fixtureName: string): string => fixtureName.split(NAME_SEPARATOR).at(-1) ?? fixtureName

const readReviewTarget = async (
  testCasesPath: string,
  fixtureName: string,
  position: number,
): Promise<FixtureReviewTarget> => {
  const fixture = await getReviewArtifactFixture(testCasesPath, fixtureName)
  return {
    kind: "pull-request",
    number: position + 1,
    title: fixture.title,
    branch: snapshotNameOf(fixtureName),
    author: MOCK_AUTHOR,
    authorAvatarUrl: null,
    branchStatus: "no-review",
    isNew: false,
    updatedAt: new Date(MOCK_UPDATED_AT),
  }
}

export const getFixtureRepository = async (testCasesPath: string, caseName: string): Promise<FixtureRepository> => {
  if (!CASE_NAME_PATTERN.test(caseName)) throw new UnknownFixtureCaseError(caseName)
  const fixtureNames = await getAllReviewArtifactFixturesByCase(testCasesPath, caseName)
  const targets = await Promise.all(
    fixtureNames.map(async (fixtureName, position) => await readReviewTarget(testCasesPath, fixtureName, position)),
  )
  return {
    name: caseName,
    path: join(testCasesPath, caseName),
    forge: "git",
    forgeSlug: null,
    problem: null,
    hasFollowedAuthors: true,
    targets,
  }
}
