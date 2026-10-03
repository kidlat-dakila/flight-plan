import { getRepositoryConfiguration } from "@/procedures/get-repository-configuration"
import {
  AT_REPOSITORIES,
  createSetupContext,
  DEV,
  LENA,
  servedByForge,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const withSavedAuthors = async () => {
  const context = createSetupContext(AT_REPOSITORIES)
  await context.repositoryStore.add(STOREFRONT, { selfAuthor: DEV, trackedAuthors: [LENA] })
  return context
}

describe("getRepositoryConfiguration", () => {
  it("reads the saved authors of a listed repository and the form for the forge that serves it", async () => {
    await expect(getRepositoryConfiguration({ name: "storefront" }, await withSavedAuthors())).resolves.toMatchObject({
      name: "storefront",
      path: STOREFRONT.path,
      form: { searchPlaceholder: "Type a name or email" },
      selfAuthor: { id: DEV.id, monogram: "DH" },
      trackedAuthors: [{ id: LENA.id }],
    })
  })

  it("builds the form from the forge that serves the repository, not the default forge", async () => {
    const context = servedByForge(await withSavedAuthors(), "gh")

    await expect(getRepositoryConfiguration({ name: "storefront" }, context)).resolves.toMatchObject({
      form: { selfAuthorHint: null },
    })
  })

  it("has nothing for a repository that is not listed", async () => {
    await expect(getRepositoryConfiguration({ name: "ledger-api" }, await withSavedAuthors())).resolves.toBeNull()
  })
})
