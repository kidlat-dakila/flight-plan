import {
  createSetupContext,
  GITHUB_FORGES,
  READY_TO_FINISH,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { searchRepositoryAuthors } from "@/procedures/search-repository-authors"

describe("searchRepositoryAuthors", () => {
  it("searches the commit authors of a repository on local git", async () => {
    const suggestions = await searchRepositoryAuthors(
      { repositoryName: "checkout-web", role: "tracked", query: "lena" },
      createSetupContext(READY_TO_FINISH),
    )

    expect(suggestions).toMatchObject({
      options: [{ id: "lena@acme.example", isTaken: true, stateLabel: "Tracked" }],
      message: null,
    })
  })

  it("lets a tracked author be chosen as the user", async () => {
    const suggestions = await searchRepositoryAuthors(
      { repositoryName: "checkout-web", role: "self", query: "lena" },
      createSetupContext(READY_TO_FINISH),
    )

    expect(suggestions).toMatchObject({ options: [{ id: "lena@acme.example", isTaken: false, stateLabel: null }] })
  })

  it("searches the forge's members when the default forge is not local git", async () => {
    const suggestions = await searchRepositoryAuthors(
      { repositoryName: "checkout-web", role: "tracked", query: "teo" },
      createSetupContext({ ...READY_TO_FINISH, forges: GITHUB_FORGES }),
    )

    expect(suggestions).toMatchObject({ options: [{ id: "@teo", detail: "@teo", isTaken: false }] })
  })

  it("has nothing for a repository the setup does not hold", async () => {
    await expect(
      searchRepositoryAuthors(
        { repositoryName: "storefront", role: "tracked", query: "" },
        createSetupContext(READY_TO_FINISH),
      ),
    ).resolves.toBeNull()
  })
})
