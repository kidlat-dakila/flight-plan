import { CHECKOUT_WEB, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { findRepositoryForges } from "@/procedures/get-setup/utils/repository-forges"
import { needsSelfAuthor, repositoryForgeOf, type SetupForge } from "@/procedures/get-setup/utils/setup"

const STOREFRONT_PATH = "/Users/dev/projects/storefront"

describe("needsSelfAuthor", () => {
  it("is true only for local git, which cannot tell who the user is", () => {
    expect(needsSelfAuthor("git")).toBe(true)
    expect(needsSelfAuthor("gh")).toBe(false)
    expect(needsSelfAuthor("gitlab")).toBe(false)
  })
})

describe("repositoryForgeOf", () => {
  it("is the forge found for the repository", () => {
    expect(repositoryForgeOf({ [CHECKOUT_WEB.path]: "gh" }, CHECKOUT_WEB.path)).toBe("gh")
  })

  it("is local git for a repository with no forge found", () => {
    expect(repositoryForgeOf({}, CHECKOUT_WEB.path)).toBe("git")
  })
})

describe("findRepositoryForges", () => {
  it("asks the environment for the forge of each repository of the setup, by path", async () => {
    const environment = {
      ...createMockSetupEnvironment(),
      findRepositoryForge: async (path: string) => await Promise.resolve<SetupForge>(path === STOREFRONT_PATH ? "gh" : "git"),
    }
    const setup = {
      ...READY_TO_FINISH,
      repositories: [...READY_TO_FINISH.repositories, { ...CHECKOUT_WEB, name: "storefront", path: STOREFRONT_PATH }],
    }

    await expect(findRepositoryForges(setup, environment)).resolves.toStrictEqual({
      [CHECKOUT_WEB.path]: "git",
      [STOREFRONT_PATH]: "gh",
    })
  })

  it("finds nothing for a setup with no repositories", async () => {
    await expect(findRepositoryForges({ ...READY_TO_FINISH, repositories: [] }, createMockSetupEnvironment())).resolves.toStrictEqual({})
  })
})
