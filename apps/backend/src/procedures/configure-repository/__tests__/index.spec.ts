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
  it("replaces the tracked users of the repository, and drops a user picked by hand earlier", async () => {
    const context = await createContext()

    await expect(
      configureRepository({ repositoryName: "storefront", trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("storefront")).resolves.toStrictEqual({
      selfAuthor: null,
      trackedAuthors: [LENA],
    })
  })

  it("lets a forge repository track nobody, so that Flight Plan follows everyone in it", async () => {
    const context = servedByForge(await createContext(), "gh")

    await expect(
      configureRepository({ repositoryName: "storefront", trackedAuthorIds: ["@teo"] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(
      configureRepository({ repositoryName: "storefront", trackedAuthorIds: [] }, context),
    ).resolves.toStrictEqual({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("storefront")).resolves.toStrictEqual({ selfAuthor: null, trackedAuthors: [] })
  })

  it("rejects an author the repository does not have", async () => {
    const context = await createContext()

    await expect(
      configureRepository(
        { repositoryName: "storefront", trackedAuthorIds: ["ghost@acme.example"] },
        context,
      ),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
  })

  it("rejects a repository that is no longer listed", async () => {
    await expect(
      configureRepository(
        { repositoryName: "ledger-api", trackedAuthorIds: [] },
        await createContext(),
      ),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ledger-api is no longer on the list." })
  })
})
