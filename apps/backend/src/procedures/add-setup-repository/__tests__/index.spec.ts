import { addSetupRepository } from "@/procedures/add-setup-repository"
import {
  AT_FORGES,
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  DEV,
  GITHUB_FORGES,
  LENA,
  servedByForge,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const SELF_AND_LENA = { selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] }

describe("addSetupRepository", () => {
  it("adds a repository folder to the setup with the authors chosen for it", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    const repository = { ...CHECKOUT_WEB, selfAuthor: DEV, trackedAuthors: [LENA] }

    await expect(addSetupRepository({ path: CHECKOUT_WEB.path, ...SELF_AND_LENA }, context)).resolves.toStrictEqual({
      kind: "accepted",
      repository,
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [repository] })
  })

  it("rejects a local git repository without the user chosen", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, selfAuthorId: null, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "Pick which user you are in checkout-web." })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("accepts a forge repository with nobody tracked, so that Flight Plan follows everyone in it", async () => {
    const context = createSetupContext({ ...AT_REPOSITORIES, forges: GITHUB_FORGES })

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, selfAuthorId: null, trackedAuthorIds: [] }, context),
    ).resolves.toMatchObject({ kind: "accepted", repository: { trackedAuthors: [] } })
  })

  it("asks for a tracked user when a forge serves the repository while the default forge is local git", async () => {
    const context = servedByForge(createSetupContext(AT_REPOSITORIES), "gh")

    await expect(addSetupRepository({ path: CHECKOUT_WEB.path, selfAuthorId: null, trackedAuthorIds: ["@lena"] }, context),
    ).resolves.toMatchObject({
      kind: "accepted",
      repository: { selfAuthor: null, trackedAuthors: [{ id: "@lena" }] },
    })
  })

  it("rejects an author the repository does not have", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, selfAuthorId: "ghost@acme.example", trackedAuthorIds: [] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("rejects a folder that is not a git repository", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: "/Users/dev/projects/meeting-notes", ...SELF_AND_LENA }, context),
    ).resolves.toStrictEqual({
      kind: "rejected",
      message: "/Users/dev/projects/meeting-notes is not a git repository.",
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("refuses to add a repository before the earlier steps are saved", async () => {
    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, ...SELF_AND_LENA }, createSetupContext(AT_FORGES)),
    ).resolves.toStrictEqual({
      kind: "rejected",
      message: "Finish the earlier steps of the setup first.",
    })
  })
})
