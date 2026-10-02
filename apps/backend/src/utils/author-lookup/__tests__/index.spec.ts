import type { RepositoryAuthor, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorSource } from "@/procedures/get-setup/utils/setup-environment"
import { createAuthorLookup } from "@/utils/author-lookup"

const LENA: RepositoryAuthor = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null }
const TEO: RepositoryAuthor = { id: "teo@acme.example", name: "Teo Marchetti", detail: "teo@acme.example", avatarUrl: null }
const FORGE_USER: RepositoryAuthor = { id: "@octo", name: "Octo Cat", detail: "@octo", avatarUrl: null }

const sourceOn = (forge: SetupForge): AuthorSource => ({ repositoryPath: "/work/checkout-web", forge })

const createLookup = (): ReturnType<typeof createAuthorLookup> =>
  createAuthorLookup({
    readCommitAuthors: async (repositoryPath) =>
      await Promise.resolve(repositoryPath === "/work/checkout-web" ? [LENA, TEO] : []),
    forgeLookup: {
      searchAuthors: async () => await Promise.resolve([FORGE_USER]),
      findAuthor: async () => await Promise.resolve(FORGE_USER),
    },
  })

describe("createAuthorLookup", () => {
  it("searches the commit authors on local git by name or username", async () => {
    const { searchAuthors } = createLookup()

    await expect(searchAuthors(sourceOn("git"), "marchetti")).resolves.toStrictEqual([TEO])
    await expect(searchAuthors(sourceOn("git"), "lena")).resolves.toStrictEqual([LENA])
    await expect(searchAuthors(sourceOn("git"), "")).resolves.toStrictEqual([LENA, TEO])
  })

  it("asks the forge when the repository is on a forge", async () => {
    await expect(createLookup().searchAuthors(sourceOn("gh"), "octo")).resolves.toStrictEqual([FORGE_USER])
  })

  it("finds a commit author by email on local git, in any letter case", async () => {
    const { findAuthor } = createLookup()

    await expect(findAuthor(sourceOn("git"), "Teo@Acme.example")).resolves.toStrictEqual(TEO)
    await expect(findAuthor(sourceOn("git"), "nobody@acme.example")).resolves.toBeNull()
  })

  it("asks the forge for a user when the repository is on a forge", async () => {
    await expect(createLookup().findAuthor(sourceOn("gh"), "@octo")).resolves.toStrictEqual(FORGE_USER)
  })
})
