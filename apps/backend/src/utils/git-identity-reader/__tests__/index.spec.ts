import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createGitIdentityReader } from "@/utils/git-identity-reader"
import { runCommand } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const ISOLATED_GIT = {
  PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
}

const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<void> => {
  const outcome = await runCommand("git", ["-C", repositoryPath, ...gitArguments], ISOLATED_GIT)
  expect(outcome).toMatchObject({ exitCode: 0 })
}

const readIdentity = createGitIdentityReader({ runCommand, environment: ISOLATED_GIT })

describe("createGitIdentityReader", () => {
  it("reads the name and email git commits with in the repository", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])
      await runGit(repositoryPath, ["config", "user.name", "Dev Harper"])
      await runGit(repositoryPath, ["config", "user.email", "Dev@Acme.example"])

      await expect(readIdentity(repositoryPath)).resolves.toStrictEqual({ name: "Dev Harper", email: "dev@acme.example" })
    })
  })

  it("reads an identity with only an email", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])
      await runGit(repositoryPath, ["config", "user.email", "dev@acme.example"])

      await expect(readIdentity(repositoryPath)).resolves.toStrictEqual({ name: null, email: "dev@acme.example" })
    })
  })

  it("reads the global git config when the repository has no email", async () => {
    await withTemporaryFolder(async (folderPath) => {
      const globalConfigPath = join(folderPath, "global.gitconfig")
      await writeFile(globalConfigPath, "[user]\n\tname = Dev Harper\n\temail = Dev@Acme.example\n")
      await runGit(folderPath, ["init", "--quiet"])
      const readWithGlobalConfig = createGitIdentityReader({
        runCommand,
        environment: { ...ISOLATED_GIT, GIT_CONFIG_GLOBAL: globalConfigPath },
      })

      await expect(readWithGlobalConfig(folderPath)).resolves.toStrictEqual({ name: "Dev Harper", email: "dev@acme.example" })
    })
  })

  it("reads no identity when git has no email", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      await runGit(repositoryPath, ["init", "--quiet"])
      await runGit(repositoryPath, ["config", "user.name", "Dev Harper"])

      await expect(readIdentity(repositoryPath)).resolves.toBeNull()
    })
  })

  it("reads no identity outside a repository", async () => {
    await expect(readIdentity("/path/that/does/not/exist")).resolves.toBeNull()
  })
})
