import { realpath } from "node:fs/promises"
import { join } from "node:path"
import { createRepositoryActivityReader } from "@/utils/repository-activity-reader"
import { runCommand } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const ISOLATED_GIT = {
  PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
}

const USER_EMAIL = "dev+work@acme.example"

interface CommitAuthor {
  readonly name: string
  readonly email: string
}

const USER: CommitAuthor = { name: "Dev Harper", email: USER_EMAIL }
const TEAMMATE: CommitAuthor = { name: "Lena Okafor", email: "lena@acme.example" }
const LOOKALIKE: CommitAuthor = { name: "Max Harper", email: `x${USER_EMAIL}` }

const runGit = async (
  repositoryPath: string,
  gitArguments: readonly string[],
  environment: Readonly<Record<string, string>> = {},
): Promise<void> => {
  const outcome = await runCommand("git", ["-C", repositoryPath, ...gitArguments], { ...ISOLATED_GIT, ...environment })
  expect(outcome).toMatchObject({ exitCode: 0 })
}

const commit = async (repositoryPath: string, author: CommitAuthor, committedAt: string): Promise<void> => {
  await runGit(repositoryPath, ["commit", "--quiet", "--allow-empty", "--message", "change"], {
    GIT_AUTHOR_NAME: author.name,
    GIT_AUTHOR_EMAIL: author.email,
    GIT_AUTHOR_DATE: committedAt,
    GIT_COMMITTER_NAME: author.name,
    GIT_COMMITTER_EMAIL: author.email,
    GIT_COMMITTER_DATE: committedAt,
  })
}

const initRepository = async (repositoryPath: string, branch: string): Promise<void> => {
  await runGit(repositoryPath, ["init", "--quiet", `--initial-branch=${branch}`])
}

const readActivity = createRepositoryActivityReader({ runCommand, environment: ISOLATED_GIT })

describe("createRepositoryActivityReader", () => {
  it("reads the date of the user's latest commit on main", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "main")
      await commit(repositoryPath, USER, "2026-10-17T08:00:00Z")
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")
      await commit(repositoryPath, TEAMMATE, "2026-10-19T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toStrictEqual({
        gitFolderPath: join(await realpath(repositoryPath), ".git"),
        isMainWorktree: true,
        branch: "main",
        latestCommitAt: new Date("2026-10-18T08:00:00Z"),
      })
    })
  })

  it("reads master when the repository has no main", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "master")
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toMatchObject({ branch: "master" })
    })
  })

  it("reads main when the repository has main and master", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "master")
      await commit(repositoryPath, USER, "2026-10-10T08:00:00Z")
      await runGit(repositoryPath, ["checkout", "--quiet", "-b", "main"])
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toMatchObject({
        branch: "main",
        latestCommitAt: new Date("2026-10-18T08:00:00Z"),
      })
    })
  })

  it("leaves out the user's commits on other branches", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "main")
      await commit(repositoryPath, USER, "2026-10-10T08:00:00Z")
      await runGit(repositoryPath, ["checkout", "--quiet", "-b", "feature"])
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toMatchObject({
        latestCommitAt: new Date("2026-10-10T08:00:00Z"),
      })
    })
  })

  it("matches the email as written and in any case, but not an email that contains it", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "main")
      await commit(repositoryPath, { ...USER, email: USER_EMAIL.toUpperCase() }, "2026-10-10T08:00:00Z")
      await commit(repositoryPath, LOOKALIKE, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toMatchObject({
        latestCommitAt: new Date("2026-10-10T08:00:00Z"),
      })
    })
  })

  it("reads a linked worktree as the repository it belongs to", async () => {
    await withTemporaryFolder(async (parentPath) => {
      const repositoryPath = join(parentPath, "shop")
      const worktreePath = join(parentPath, "shop-fix")
      await runGit(parentPath, ["init", "--quiet", "--initial-branch=main", repositoryPath])
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")
      await runGit(repositoryPath, ["worktree", "add", "--quiet", "-b", "fix", worktreePath])

      await expect(readActivity(worktreePath, USER_EMAIL)).resolves.toStrictEqual({
        gitFolderPath: join(await realpath(repositoryPath), ".git"),
        isMainWorktree: false,
        branch: "main",
        latestCommitAt: new Date("2026-10-18T08:00:00Z"),
      })
    })
  })

  it("reads nothing when the user has no commit on main", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "main")
      await commit(repositoryPath, TEAMMATE, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toBeNull()
    })
  })

  it("reads nothing when the repository has neither main nor master", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await initRepository(repositoryPath, "trunk")
      await commit(repositoryPath, USER, "2026-10-18T08:00:00Z")

      await expect(readActivity(repositoryPath, USER_EMAIL)).resolves.toBeNull()
    })
  })

  it("reads nothing outside a repository", async () => {
    await expect(readActivity("/path/that/does/not/exist", USER_EMAIL)).resolves.toBeNull()
  })
})
