import { configureRepository } from "@/procedures/configure-repository"
import {
  AT_REPOSITORIES,
  createSetupContext,
  DEV,
  LENA,
  servedByForge,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const createContext = async () => {
  const context = createSetupContext(AT_REPOSITORIES)
  await context.repositoryStore.add(STOREFRONT, { selfAuthor: DEV, trackedAuthors: [] })
  return context
}

describe("configureRepository", () => {
  it("replaces the user and the tracked users of the repository", async () => {
    const context = await createContext()

    await expect(
      configureRepository({ repositoryName: "storefront", selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("storefront")).resolves.toStrictEqual({
      selfAuthor: DEV,
      trackedAuthors: [LENA],
    })
  })

  it("asks for the user when local git serves the repository, and changes nothing", async () => {
    const context = await createContext()

    await expect(
      configureRepository({ repositoryName: "storefront", selfAuthorId: null, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "Pick which user you are in storefront." })
    await expect(context.repositoryStore.readAuthors("storefront")).resolves.toStrictEqual({
      selfAuthor: DEV,
      trackedAuthors: [],
    })
  })

  it("lets a forge repository track nobody, so that Flight Plan follows everyone in it", async () => {
    const context = servedByForge(await createContext(), "gh")

    await expect(
      configureRepository({ repositoryName: "storefront", selfAuthorId: null, trackedAuthorIds: ["@teo"] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(
      configureRepository({ repositoryName: "storefront", selfAuthorId: null, trackedAuthorIds: [] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("storefront")).resolves.toStrictEqual({ selfAuthor: null, trackedAuthors: [] })
  })

  it("rejects an author the repository does not have", async () => {
    const context = await createContext()

    await expect(
      configureRepository(
        { repositoryName: "storefront", selfAuthorId: DEV.id, trackedAuthorIds: ["ghost@acme.example"] },
        context,
      ),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
  })

  it("rejects a repository that is no longer listed", async () => {
    await expect(
      configureRepository(
        { repositoryName: "ledger-api", selfAuthorId: DEV.id, trackedAuthorIds: [] },
        await createContext(),
      ),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ledger-api is no longer on the list." })
  })
})
