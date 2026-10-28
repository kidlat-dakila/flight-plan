import { join } from "node:path"
import { getAllFixtureCases, getAllReviewArtifactFixturesByCase } from "@flightplan/playground-fixtures"
import { codeBlocksPathOf, listFixtureNames, storedCodeBlocksOf } from "@flightplan/playground-fixtures/test-setup"

interface CasesFolder {
  readonly label: string
  readonly path: string
}

interface FolderFixture {
  readonly id: string
  readonly casesPath: string
  readonly fixtureName: string
}

const LAB_PATH = join(import.meta.dirname, "..", "..")
const CASES_FOLDER = "cases"
const PLAYGROUNDS_FOLDER = "playgrounds"
const ID_SEPARATOR = "/"
const PLAYGROUNDS_PATH = join(LAB_PATH, PLAYGROUNDS_FOLDER)

const LANGUAGES = await getAllFixtureCases(PLAYGROUNDS_PATH)

const CASES_FOLDERS: readonly CasesFolder[] = [
  { label: CASES_FOLDER, path: join(LAB_PATH, CASES_FOLDER) },
  ...LANGUAGES.map((language) => ({ label: [PLAYGROUNDS_FOLDER, language].join(ID_SEPARATOR), path: join(PLAYGROUNDS_PATH, language) })),
]

const listFolderFixtures = async ({ label, path }: CasesFolder): Promise<FolderFixture[]> =>
  (await listFixtureNames(path, getAllFixtureCases, getAllReviewArtifactFixturesByCase))
    .map((fixtureName) => ({ id: [label, fixtureName].join(ID_SEPARATOR), casesPath: path, fixtureName }))

const FIXTURES = (await Promise.all(CASES_FOLDERS.map(listFolderFixtures))).flat()

describe("the stored form of the code block groups of every lab case and playground", () => {
  it.each(FIXTURES)("builds the groups of $id as its committed snapshot holds them", async ({ casesPath, fixtureName }) => {
    await expect(await storedCodeBlocksOf(casesPath, fixtureName)).toMatchFileSnapshot(codeBlocksPathOf(casesPath, fixtureName))
  })
})
