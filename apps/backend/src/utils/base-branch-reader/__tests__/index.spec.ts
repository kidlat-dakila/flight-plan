import { join } from "node:path"
import { createBaseBranchReader } from "@/utils/base-branch-reader"
import { runCommand } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const ISOLATED_GIT = {
  PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Dev Harper",
  GIT_AUTHOR_EMAIL: "dev@acme.example",
  GIT_COMMITTER_NAME: "Dev Harper",
  GIT_COMMITTER_EMAIL: "dev@acme.example",
}

const runGit = async (
  repositoryPath: string,
  gitArguments: readonly string[],
  environment: Readonly<Record<string, string>> = {},
): Promise<void> => {
  const outcome = await runCommand("git", ["-C", repositoryPath, ...gitArguments], { ...ISOLATED_GIT, ...environment })
  expect(outcome).toMatchObject({ exitCode: 0 })
}

const commit = async (repositoryPath: string, committedAt: string): Promise<void> => {
  await runGit(repositoryPath, ["commit", "--quiet", "--allow-empty", "--message", "change"], {
    GIT_AUTHOR_DATE: committedAt,
    GIT_COMMITTER_DATE: committedAt,
  })
}

const initRepository = async (repositoryPath: string, branch: string): Promise<void> => {
  await runGit(repositoryPath, ["init", "--quiet", `--initial-branch=${branch}`])
}

const cloneOf = async (parentPath: string, originPath: string): Promise<string> => {
  const clonePath = join(parentPath, "clone")
  await runGit(parentPath, ["clone", "--quiet", originPath, clonePath])
  return clonePath
}

const reader = createBaseBranchReader({ runCommand, environment: ISOLATED_GIT })

describe("createBaseBranchReader", () => {
  describe("detectMainBranch", () => {
    it("names the branch origin's HEAD points at", async () => {
      await withTemporaryFolder(async (parentPath) => {
        const originPath = join(parentPath, "origin")
        await runGit(parentPath, ["init", "--quiet", "--initial-branch=trunk", originPath])
        await commit(originPath, "2026-10-10T08:00:00Z")

        await expect(reader.detectMainBranch(await cloneOf(parentPath, originPath))).resolves.toBe("trunk")
      })
    })

    it("names main, then master, when origin has no HEAD", async () => {
      await withTemporaryFolder(async (repositoryPath) => {
        await initRepository(repositoryPath, "master")
        await commit(repositoryPath, "2026-10-10T08:00:00Z")

        await expect(reader.detectMainBranch(repositoryPath)).resolves.toBe("master")

        await runGit(repositoryPath, ["branch", "main"])

        await expect(reader.detectMainBranch(repositoryPath)).resolves.toBe("main")
      })
    })

    it("names nothing when the repository has neither main nor master", async () => {
      await withTemporaryFolder(async (repositoryPath) => {
        await initRepository(repositoryPath, "develop")
        await commit(repositoryPath, "2026-10-10T08:00:00Z")

        await expect(reader.detectMainBranch(repositoryPath)).resolves.toBeNull()
      })
    })

    it("names nothing outside a repository", async () => {
      await expect(reader.detectMainBranch("/path/that/does/not/exist")).resolves.toBeNull()
    })
  })

  describe("listBranches", () => {
    it("lists local and origin branches once per name, with the time of the newer last commit", async () => {
      await withTemporaryFolder(async (parentPath) => {
        const originPath = join(parentPath, "origin")
        await runGit(parentPath, ["init", "--quiet", "--initial-branch=main", originPath])
        await commit(originPath, "2026-10-10T08:00:00Z")
        await runGit(originPath, ["checkout", "--quiet", "-b", "release"])
        await commit(originPath, "2026-10-12T08:00:00Z")
        const clonePath = await cloneOf(parentPath, originPath)
        await runGit(clonePath, ["checkout", "--quiet", "-b", "develop", "origin/main"])
        await commit(clonePath, "2026-10-15T08:00:00Z")

        const branches = await reader.listBranches(clonePath)

        expect(branches).toHaveLength(3)
        expect(branches).toStrictEqual(expect.arrayContaining([
          { name: "main", committedAt: new Date("2026-10-10T08:00:00Z") },
          { name: "release", committedAt: new Date("2026-10-12T08:00:00Z") },
          { name: "develop", committedAt: new Date("2026-10-15T08:00:00Z") },
        ]))
      })
    })

    it("lists nothing outside a repository", async () => {
      await expect(reader.listBranches("/path/that/does/not/exist")).resolves.toBeNull()
    })
  })
})
