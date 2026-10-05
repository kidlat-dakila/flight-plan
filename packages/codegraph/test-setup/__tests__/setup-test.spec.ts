import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { assembleGitAdapter, readRemote, type GitAdapter } from "@flightplan/git-forge"
import { BASE_COMMIT, CASE_REMOTE, HEAD_COMMIT } from "@test-setup/case-adapter"
import { setupTest } from "@test-setup/setup-test"

const GREETING_DIFF = [
  "diff --git a/src/greeting.ts b/src/greeting.ts",
  "--- a/src/greeting.ts",
  "+++ b/src/greeting.ts",
  "@@ -1 +1 @@",
  "-export const greeting = \"hello\"",
  "+export const greeting = \"good morning\"",
].join("\n")

const createRepository = async (): Promise<string> => {
  const repoPath = await mkdtemp(join(tmpdir(), "codegraph-case-"))
  onTestFinished(async () => {
    await rm(repoPath, { recursive: true, force: true })
  })
  await mkdir(join(repoPath, "src"))
  await writeFile(join(repoPath, "src", "greeting.ts"), "export const greeting = \"hello\"\n")
  return repoPath
}

const openAdapter = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("setupTest", () => {
  it("makes git-forge refuse to open a repository before it is called", async () => {
    await expect(openAdapter("/anywhere")).rejects.toThrow("Call setupTest")
  })

  it("makes git-forge read the base commit from the repository folder", async () => {
    const repoPath = await createRepository()
    setupTest({ repoPath, diffs: [GREETING_DIFF] })

    const gitAdapter = await openAdapter(repoPath)

    await expect(gitAdapter.blob("src/greeting.ts", BASE_COMMIT)).resolves.toBe("export const greeting = \"hello\"\n")
  })

  it("makes git-forge read the head commit with the diffs applied", async () => {
    const repoPath = await createRepository()
    setupTest({ repoPath, diffs: [GREETING_DIFF] })

    const gitAdapter = await openAdapter(repoPath)

    await expect(gitAdapter.blob("src/greeting.ts", HEAD_COMMIT)).resolves.toBe(
      "export const greeting = \"good morning\"\n",
    )
  })

  it("gives the same repository a different change in another test", async () => {
    const repoPath = await createRepository()
    setupTest({ repoPath, diffs: [] })

    const gitAdapter = await openAdapter(repoPath)

    await expect(gitAdapter.blob("src/greeting.ts", HEAD_COMMIT)).resolves.toBe("export const greeting = \"hello\"\n")
  })

  it("makes git-forge answer with the case remote", async () => {
    const repoPath = await createRepository()
    setupTest({ repoPath, diffs: [] })

    await expect(readRemote(repoPath)).resolves.toStrictEqual(CASE_REMOTE)
  })
})
