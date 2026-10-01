import { addSetupRepository } from "@/procedures/add-setup-repository"
import {
  AT_FORGES,
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

describe("addSetupRepository", () => {
  it("adds a repository folder to the setup", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(addSetupRepository({ path: CHECKOUT_WEB.path }, context)).resolves.toStrictEqual({
      kind: "accepted",
      repository: CHECKOUT_WEB,
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [CHECKOUT_WEB] })
  })

  it("rejects a folder that is not a git repository", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(addSetupRepository({ path: "/Users/dev/projects/meeting-notes" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/Users/dev/projects/meeting-notes is not a git repository.",
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("refuses to add a repository before the earlier steps are saved", async () => {
    await expect(addSetupRepository({ path: CHECKOUT_WEB.path }, createSetupContext(AT_FORGES))).resolves.toStrictEqual({
      kind: "rejected",
      message: "Finish the earlier steps of the setup first.",
    })
  })
})
