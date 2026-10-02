import type { ProcedureContext } from "@/procedures/context"
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

  it("finds a folder by letters spread across its name", async () => {
    await expect(
      searchRepositoryFolders({ query: "pmtsvc" }, createSetupContext(EMPTY_SETUP)),
    ).resolves.toMatchObject({ options: [{ name: "payments-service" }] })
  })

  it.each(["", "p", "pa", "  pa  "])("asks for more characters when the text is “%s”", async (query) => {
    await expect(searchRepositoryFolders({ query }, createSetupContext(EMPTY_SETUP))).resolves.toStrictEqual({
      options: [],
      message: "Type at least 3 characters to search for a repository folder.",
    })
  })

  it("does not look for folders until the text has 3 characters", async () => {
    const context = createSetupContext(EMPTY_SETUP)
    const failingContext: ProcedureContext = {
      ...context,
      setupEnvironment: {
        ...context.setupEnvironment,
        findRepositoryFolders: async () => await Promise.reject(new Error("The folders must not be scanned.")),
      },
    }

    await expect(searchRepositoryFolders({ query: "pa" }, failingContext)).resolves.toMatchObject({ options: [] })
  })

  it("counts the characters without the spaces around them", async () => {
    await expect(
      searchRepositoryFolders({ query: " pay " }, createSetupContext(EMPTY_SETUP)),
    ).resolves.toMatchObject({ options: [{ name: "payments-service" }] })
  })

  it("leaves out a folder that is not a repository", async () => {
    await expect(
      searchRepositoryFolders({ query: "meeting-notes" }, createSetupContext(EMPTY_SETUP)),
    ).resolves.toStrictEqual({ options: [], message: "No repository folder matches “meeting-notes”." })
  })
})
