import { join } from "node:path"
import { createBranchPuller } from "@/utils/branch-puller"
import { runCommand } from "@/utils/run-command"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const GIT_ENVIRONMENT = {
  PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  GIT_AUTHOR_NAME: "Dev Harper",
  GIT_AUTHOR_EMAIL: "dev@acme.example",
  GIT_COMMITTER_NAME: "Dev Harper",
  GIT_COMMITTER_EMAIL: "dev@acme.example",
  GIT_CONFIG_GLOBAL: "/dev/null",
}
const BRANCH = "feature/held-stock"

const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<string> => {
  const outcome = await runCommand("git", ["-C", repositoryPath, ...gitArguments], GIT_ENVIRONMENT)
  expect(outcome).toMatchObject({ exitCode: 0 })
  return outcome.output.trim()
}

const commitFile = async (repositoryPath: string, path: string, text: string): Promise<string> => {
  await writeText(join(repositoryPath, path), text)
  await runGit(repositoryPath, ["add", "--all"])
  await runGit(repositoryPath, ["commit", "--quiet", "-m", `Change ${path}`])
  return await runGit(repositoryPath, ["rev-parse", "HEAD"])
}

interface Checkouts {
  readonly remotePath: string
  readonly localPath: string
}

const withCheckouts = async (run: (checkouts: Checkouts) => Promise<void>): Promise<void> => {
  await withTemporaryFolder(async (rootPath) => {
    const remotePath = join(rootPath, "remote")
    const localPath = join(rootPath, "local")
    await runGit(rootPath, ["init", "--quiet", "--initial-branch=main", remotePath])
    await commitFile(remotePath, "src/price.ts", "export const price = 1\n")
    await runGit(remotePath, ["checkout", "--quiet", "-b", BRANCH])
    await commitFile(remotePath, "src/price.ts", "export const price = 2\n")
    await runGit(rootPath, ["clone", "--quiet", remotePath, localPath])
    await run({ remotePath, localPath })
  })
}

const pullBranch = createBranchPuller({ runCommand, environment: GIT_ENVIRONMENT })

describe("createBranchPuller", () => {
  it("fast-forwards the branch that is checked out", async () => {
    await withCheckouts(async ({ remotePath, localPath }) => {
      const pushedCommit = await commitFile(remotePath, "src/price.ts", "export const price = 3\n")

      await expect(pullBranch(localPath, BRANCH)).resolves.toStrictEqual({ kind: "pulled" })

      await expect(runGit(localPath, ["rev-parse", "HEAD"])).resolves.toBe(pushedCommit)
    })
  })

  it("fast-forwards a local branch that is not checked out", async () => {
    await withCheckouts(async ({ remotePath, localPath }) => {
      await runGit(localPath, ["checkout", "--quiet", "main"])
      const pushedCommit = await commitFile(remotePath, "src/price.ts", "export const price = 3\n")

      await expect(pullBranch(localPath, BRANCH)).resolves.toStrictEqual({ kind: "pulled" })

      await expect(runGit(localPath, ["rev-parse", `refs/heads/${BRANCH}`])).resolves.toBe(pushedCommit)
    })
  })

  it("keeps local commits the remote does not have yet", async () => {
    await withCheckouts(async ({ localPath }) => {
      const localCommit = await commitFile(localPath, "src/price.ts", "export const price = 4\n")

      await expect(pullBranch(localPath, BRANCH)).resolves.toStrictEqual({ kind: "pulled" })

      await expect(runGit(localPath, ["rev-parse", "HEAD"])).resolves.toBe(localCommit)
    })
  })

  it("says why when the local branch and the remote branch have diverged", async () => {
    await withCheckouts(async ({ remotePath, localPath }) => {
      await commitFile(remotePath, "src/price.ts", "export const price = 3\n")
      await commitFile(localPath, "src/price.ts", "export const price = 4\n")

      const pull = await pullBranch(localPath, BRANCH)

      expect(pull.kind).toBe("failed")
      expect(pull.kind === "failed" ? pull.reason : "").toContain("fast-forward")
    })
  })

  it("says why when the remote does not have the branch", async () => {
    await withCheckouts(async ({ localPath }) => {
      const pull = await pullBranch(localPath, "feature/unpushed")

      expect(pull.kind).toBe("failed")
      expect(pull.kind === "failed" ? pull.reason : "").toContain("feature/unpushed")
    })
  })

  it("pulls nothing in a repository that has no remote", async () => {
    await withCheckouts(async ({ remotePath }) => {
      await expect(pullBranch(remotePath, BRANCH)).resolves.toStrictEqual({ kind: "local-only" })
    })
  })
})
