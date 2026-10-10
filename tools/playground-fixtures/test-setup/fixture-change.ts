import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { setupTest } from "./setup-test"

const NAME_SEPARATOR = "/"
const LINE_BREAK = "\n"
const CASE_REPOSITORY = { id: "git", root: "", secret: null, username: "", baseUrl: "" } as const

const changedSnapshotSchema = z.object({ diff: z.array(z.string()) })

const readDiff = async (testCasesPath: string, caseName: string, snapshotName: string): Promise<string> => {
  const text = await readFile(join(testCasesPath, caseName, "snapshots", `${snapshotName}.snapshot.json`), "utf8")
  const parsed: unknown = JSON.parse(text)
  return changedSnapshotSchema.parse(parsed).diff.join(LINE_BREAK)
}

export const setupFixtureChange = async (testCasesPath: string, fixtureName: string): Promise<GitAdapter> => {
  const [caseName, snapshotName] = fixtureName.split(NAME_SEPARATOR)
  setupTest({ repoPath: join(testCasesPath, caseName, "repo"), diffs: [await readDiff(testCasesPath, caseName, snapshotName)] })
  const resolved = await assembleGitAdapter(CASE_REPOSITORY)
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

export const listFixtureNames = async (testCasesPath: string, listCases: (path: string) => Promise<string[]>, listFixtures: (path: string, caseName: string) => Promise<string[]>): Promise<string[]> => {
  const caseNames = await listCases(testCasesPath)
  const fixtureNames = await Promise.all(caseNames.map(async (caseName) => await listFixtures(testCasesPath, caseName)))
  return fixtureNames.flat()
}
