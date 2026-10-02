import { join } from "node:path"
import { createCommitAuthorReader } from "@/utils/commit-author-reader"
import { runCommand } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const COMMIT_LIMIT = 1000
const GIT_PATH = { PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin" }

const runGit = async (repositoryPath: string, gitArguments: readonly string[], person?: string[]): Promise<void> => {
  const [name = "", email = ""] = person ?? []
  const environment = {
    ...GIT_PATH,
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
  }
  const outcome = await runCommand("git", ["-C", repositoryPath, ...gitArguments], environment)
  expect(outcome).toMatchObject({ exitCode: 0 })
}

const commitAs = async (repositoryPath: string, name: string, email: string): Promise<void> => {
  await runGit(repositoryPath, ["commit", "--allow-empty", "-m", `Commit by ${name}`], [name, email])
}

const readerWithLimit = (commitLimit: number): ReturnType<typeof createCommitAuthorReader> =>
  createCommitAuthorReader({ runCommand, environment: GIT_PATH, commitLimit })

describe("createCommitAuthorReader", () => {
  it("lists who committed to the repository, newest first and once each", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])
      await commitAs(repositoryPath, "Dev Harper", "dev@acme.example")
      await commitAs(repositoryPath, "Lena Okafor", "lena@acme.example")
      await commitAs(repositoryPath, "Devon Harper", "DEV@acme.example")

      await expect(readerWithLimit(COMMIT_LIMIT)(repositoryPath)).resolves.toStrictEqual([
        { id: "dev@acme.example", name: "Devon Harper", detail: "dev@acme.example", avatarUrl: null },
        { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null },
      ])
    })
  })

  it("reads no further back than the commit limit", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])
      await commitAs(repositoryPath, "Dev Harper", "dev@acme.example")
      await commitAs(repositoryPath, "Lena Okafor", "lena@acme.example")

      await expect(readerWithLimit(1)(repositoryPath)).resolves.toMatchObject([{ name: "Lena Okafor" }])
    })
  })

  it("has nobody for a repository without commits", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])

      await expect(readerWithLimit(COMMIT_LIMIT)(repositoryPath)).resolves.toStrictEqual([])
    })
  })

  it("has nobody for a folder that is not a repository, or does not exist", async () => {
    await withTemporaryFolder(async (folder) => {
      await expect(readerWithLimit(COMMIT_LIMIT)(folder)).resolves.toStrictEqual([])
      await expect(readerWithLimit(COMMIT_LIMIT)(join(folder, "missing"))).resolves.toStrictEqual([])
    })
  })
})
