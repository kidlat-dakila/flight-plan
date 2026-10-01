import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { searchRepositoryFolders } from "@/procedures/search-repository-folders"

describe("searchRepositoryFolders", () => {
  it("suggests the repository folders that match the typed text", async () => {
    await expect(searchRepositoryFolders({ query: "pay" }, createSetupContext(EMPTY_SETUP))).resolves.toStrictEqual({
      options: [
        { path: "/Users/dev/projects/payments-service", name: "payments-service", isAdded: false, stateLabel: null },
      ],
      message: null,
    })
  })

  it("marks a folder the setup already holds", async () => {
    await expect(
      searchRepositoryFolders({ query: "checkout" }, createSetupContext(READY_TO_FINISH)),
    ).resolves.toMatchObject({ options: [{ name: "checkout-web", isAdded: true, stateLabel: "Added" }] })
  })

  it("leaves out a folder that is not a repository", async () => {
    await expect(
      searchRepositoryFolders({ query: "meeting-notes" }, createSetupContext(EMPTY_SETUP)),
    ).resolves.toStrictEqual({ options: [], message: "No repository folder matches “meeting-notes”." })
  })
})
