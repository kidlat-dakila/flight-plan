import { join } from "node:path"
import { createGitChangeReader } from "@/utils/git-change-reader"
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

const createRepository = async (repositoryPath: string): Promise<{ readonly baseCommit: string, readonly headCommit: string }> => {
  await runGit(repositoryPath, ["init", "--quiet", "--initial-branch=main"])
  const baseCommit = await commitFile(repositoryPath, "src/price.ts", "export const price = 1\n")
  await runGit(repositoryPath, ["checkout", "--quiet", "-b", "feature/held-stock"])
  await commitFile(repositoryPath, "src/price.ts", "export const price = 2\n")
  const headCommit = await commitFile(repositoryPath, "src/held.ts", "export const held = 0\n")
  await runGit(repositoryPath, ["checkout", "--quiet", "main"])
  await commitFile(repositoryPath, "README.md", "Later on main\n")
  return { baseCommit, headCommit }
}

const reader = createGitChangeReader({ runCommand, environment: GIT_ENVIRONMENT })

describe("createGitChangeReader", () => {
  it("finds the head of a branch and the main branch it is compared with", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      const { headCommit } = await createRepository(repositoryPath)
      const mainCommit = await runGit(repositoryPath, ["rev-parse", "main"])

      await expect(reader.findRevision(repositoryPath, "feature/held-stock")).resolves.toStrictEqual({
        headCommit,
        baseCommit: mainCommit,
      })
    })
  })

  it("has no revision for a branch the repository does not hold", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await createRepository(repositoryPath)

      await expect(reader.findRevision(repositoryPath, "missing")).resolves.toBeNull()
    })
  })

  it("lists and diffs what the branch changed since it left the main branch, without what main did since", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await createRepository(repositoryPath)
      const revision = await reader.findRevision(repositoryPath, "feature/held-stock")
      if (revision === null) throw new Error("The revision was not found.")

      await expect(reader.listChangedPaths(repositoryPath, revision)).resolves.toStrictEqual(["src/held.ts", "src/price.ts"])
      const diff = await reader.readDiff(repositoryPath, revision)

      expect(diff).toContain("+export const price = 2")
      expect(diff).toContain("+++ b/src/held.ts")
      expect(diff).not.toContain("README.md")
    })
  })

  it("reads a file as it is at a commit, and nothing for a path outside the repository", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      const { baseCommit, headCommit } = await createRepository(repositoryPath)

      await expect(reader.readFile(repositoryPath, headCommit, "src/price.ts")).resolves.toBe("export const price = 2\n")
      await expect(reader.readFile(repositoryPath, baseCommit, "src/price.ts")).resolves.toBe("export const price = 1\n")
      await expect(reader.readFile(repositoryPath, headCommit, "src/missing.ts")).resolves.toBeNull()
      await expect(reader.readFile(repositoryPath, headCommit, "../outside.ts")).resolves.toBeNull()
      await expect(reader.readFile(repositoryPath, headCommit, "--help")).resolves.toBeNull()
    })
  })

  it("lists every file of a commit, and nothing for a commit the repository does not hold", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      const { baseCommit, headCommit } = await createRepository(repositoryPath)

      await expect(reader.listPaths(repositoryPath, headCommit)).resolves.toStrictEqual(["src/held.ts", "src/price.ts"])
      await expect(reader.listPaths(repositoryPath, baseCommit)).resolves.toStrictEqual(["src/price.ts"])
      await expect(reader.listPaths(repositoryPath, "0000000000000000000000000000000000000000")).resolves.toBeNull()
    })
  })
})
