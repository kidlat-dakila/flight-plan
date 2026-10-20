import { addSetupRepository } from "@/procedures/add-setup-repository"
import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  GITHUB_FORGES,
  LENA,
  servedByForge,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

const LENA_TRACKED = { trackedAuthorIds: [LENA.id] }

describe("addSetupRepository", () => {
  it("adds a repository folder to the setup with the authors chosen for it", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    const repository = { ...CHECKOUT_WEB, trackedAuthors: [LENA] }

    await expect(addSetupRepository({ path: CHECKOUT_WEB.path, ...LENA_TRACKED }, context)).resolves.toStrictEqual({
      kind: "accepted",
      repository,
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [repository] })
  })

  it("accepts a local git repository with nobody picked", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, trackedAuthorIds: [] }, context),
    ).resolves.toMatchObject({ kind: "accepted", repository: { selfAuthor: null, trackedAuthors: [] } })
  })

  it("accepts a forge repository with nobody tracked, so that Flight Plan follows everyone in it", async () => {
    const context = createSetupContext({ ...AT_REPOSITORIES, forges: GITHUB_FORGES })

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, trackedAuthorIds: [] }, context),
    ).resolves.toMatchObject({ kind: "accepted", repository: { trackedAuthors: [] } })
  })

  it("asks for a tracked user when a forge serves the repository while the default forge is local git", async () => {
    const context = servedByForge(createSetupContext(AT_REPOSITORIES), "gh")

    await expect(addSetupRepository({ path: CHECKOUT_WEB.path, trackedAuthorIds: ["@lena"] }, context),
    ).resolves.toMatchObject({
      kind: "accepted",
      repository: { selfAuthor: null, trackedAuthors: [{ id: "@lena" }] },
    })
  })

  it("rejects an author the repository does not have", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, trackedAuthorIds: ["ghost@acme.example"] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("rejects a folder that is not a git repository", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      addSetupRepository({ path: "/Users/dev/projects/meeting-notes", ...LENA_TRACKED }, context),
    ).resolves.toStrictEqual({
      kind: "rejected",
      message: "/Users/dev/projects/meeting-notes is not a git repository.",
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
  })

  it("adds a repository before any other step is saved, since the repositories come first", async () => {
    const context = createSetupContext(EMPTY_SETUP)

    await expect(
      addSetupRepository({ path: CHECKOUT_WEB.path, ...LENA_TRACKED }, context),
    ).resolves.toMatchObject({ kind: "accepted" })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [{ name: "checkout-web" }] })
  })
})
