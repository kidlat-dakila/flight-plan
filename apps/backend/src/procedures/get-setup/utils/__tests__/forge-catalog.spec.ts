import { CODE_HOST_FEATURES } from "@/procedures/get-setup/utils/forge-catalog"
import { runCommand } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"

const ISOLATED_GIT = {
  PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
}

const openLocalGit = async (repositoryPath: string): Promise<GitAdapter> => {
  await runCommand("git", ["-C", repositoryPath, "init", "--quiet"], ISOLATED_GIT)
  const resolved = await assembleGitAdapter({ id: "git", root: repositoryPath, secret: null, username: "", baseUrl: "", environment: ISOLATED_GIT })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("CODE_HOST_FEATURES", () => {
  it("names at least one capability behind each feature", () => {
    expect(CODE_HOST_FEATURES.filter((feature) => feature.capabilities.length === 0)).toStrictEqual([])
  })

  it("lists only what local git cannot do", async () => {
    await withTemporaryFolder(async (repositoryPath) => {
      const localGit = await openLocalGit(repositoryPath)
      const supported = CODE_HOST_FEATURES.flatMap((feature) => feature.capabilities).filter((capability) => localGit.supports(capability))

      expect(supported).toStrictEqual([])
    })
  })
})
