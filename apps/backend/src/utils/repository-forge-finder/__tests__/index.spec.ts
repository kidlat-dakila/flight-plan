import { GITHUB_FORGES, LOCAL_GIT_FORGES } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { Remote } from "@/utils/git-adapter/helpers/remote"
import { createRepositoryForgeFinder } from "@/utils/repository-forge-finder"

const GITHUB_REMOTE: Remote = { host: "github.com", owner: "acme", name: "storefront", fullName: "acme/storefront" }

const finderWith = (remote: Remote | null) => createRepositoryForgeFinder({ readRemote: async () => await Promise.resolve(remote) })

describe("createRepositoryForgeFinder", () => {
  it("picks the forge connected for the host of the remote, whatever the default forge is", async () => {
    const connected = { connections: [...LOCAL_GIT_FORGES.connections, ...GITHUB_FORGES.connections], defaultForge: "git" } as const

    await expect(finderWith(GITHUB_REMOTE)("/work/storefront", connected)).resolves.toBe("gh")
  })

  it("is the default forge when no connected forge serves the remote", async () => {
    await expect(finderWith(null)("/work/storefront", LOCAL_GIT_FORGES)).resolves.toBe("git")
    await expect(finderWith(GITHUB_REMOTE)("/work/storefront", null)).resolves.toBe("git")
  })
})
