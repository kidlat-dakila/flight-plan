import { adapterWith } from "@/__tests__/adapter-stub"
import type { RepositoryAuthor, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorSource } from "@/procedures/get-setup/utils/setup-environment"
import { createAuthorLookup } from "@/utils/author-lookup"
import type { OpenedRepository, RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type GitAdapter, type Person } from "@flightplan/git-forge"

const LENA: RepositoryAuthor = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null }
const TEO: RepositoryAuthor = { id: "teo@acme.example", name: "Teo Marchetti", detail: "teo@acme.example", avatarUrl: null }
const OCTO: Person = { login: "Octo", name: "Octo Cat", avatarUrl: "https://avatars.test/octo.png" }
const NAMELESS: Person = { login: "bot", avatarUrl: "" }

const sourceOn = (forge: SetupForge): AuthorSource => ({ repositoryPath: "/work/checkout-web", forge, forges: null })

const adapterFinding = (searchPeople: GitAdapter["searchPeople"]): OpenedRepository => ({
  forge: "gh",
  adapterName: "gh",
  forgeSlug: "acme/checkout-web",
  resolved: { ok: true, repo: "acme/checkout-web", gitAdapter: adapterWith("gh", { searchPeople }) },
})

const createLookup = (opened: OpenedRepository): ReturnType<typeof createAuthorLookup> => {
  const openRepository: RepositoryAdapterOpener = async () => await Promise.resolve(opened)
  return createAuthorLookup({
    readCommitAuthors: async (repositoryPath) =>
      await Promise.resolve(repositoryPath === "/work/checkout-web" ? [LENA, TEO] : []),
    openRepository,
  })
}

const peopleFound = adapterFinding(async () => await Promise.resolve([OCTO, NAMELESS]))

describe("createAuthorLookup", () => {
  it("searches the commit authors on local git by name or username", async () => {
    const { searchAuthors } = createLookup(peopleFound)

    await expect(searchAuthors(sourceOn("git"), "marchetti")).resolves.toStrictEqual({ authors: [TEO], problem: null })
    await expect(searchAuthors(sourceOn("git"), "lena")).resolves.toStrictEqual({ authors: [LENA], problem: null })
    await expect(searchAuthors(sourceOn("git"), "")).resolves.toStrictEqual({ authors: [LENA, TEO], problem: null })
  })

  it("asks the forge's adapter for people, identified by their handle", async () => {
    await expect(createLookup(peopleFound).searchAuthors(sourceOn("gh"), "o")).resolves.toStrictEqual({
      authors: [
        { id: "@Octo", name: "Octo Cat", detail: "@Octo", avatarUrl: "https://avatars.test/octo.png" },
        { id: "@bot", name: "bot", detail: "@bot", avatarUrl: null },
      ],
      problem: null,
    })
  })

  it("reports the problem when the forge cannot be opened", async () => {
    const lookup = createLookup({
      forge: "github",
      adapterName: "github",
      forgeSlug: null,
      resolved: { ok: false, repo: "", error: new GitAdapterError("no token", "auth") },
    })

    await expect(lookup.searchAuthors(sourceOn("github"), "o")).resolves.toStrictEqual({ authors: [], problem: "auth" })
  })

  it("reports the problem when the forge's search fails", async () => {
    const lookup = createLookup(
      adapterFinding(async () => await Promise.reject(new GitAdapterError("offline", "network"))),
    )

    await expect(lookup.searchAuthors(sourceOn("gh"), "o")).resolves.toStrictEqual({ authors: [], problem: "network" })
  })

  it("reports an unexpected failure as an unknown problem", async () => {
    const lookup = createLookup(adapterFinding(async () => await Promise.reject(new Error("boom"))))

    await expect(lookup.searchAuthors(sourceOn("gh"), "o")).resolves.toStrictEqual({ authors: [], problem: "unknown" })
  })

  it("finds a commit author by email on local git, in any letter case", async () => {
    const { findAuthor } = createLookup(peopleFound)

    await expect(findAuthor(sourceOn("git"), "Teo@Acme.example")).resolves.toStrictEqual(TEO)
    await expect(findAuthor(sourceOn("git"), "nobody@acme.example")).resolves.toBeNull()
  })

  it("finds a forge user by handle, ignoring the leading @ and the letter case", async () => {
    const search = vi.fn<GitAdapter["searchPeople"]>(async () => await Promise.resolve([OCTO, NAMELESS]))
    const { findAuthor } = createLookup(adapterFinding(search))

    await expect(findAuthor(sourceOn("gh"), "@octo")).resolves.toMatchObject({ id: "@Octo", name: "Octo Cat" })
    expect(search).toHaveBeenCalledWith("octo")
  })

  it("does not find a forge user that the search does not return", async () => {
    await expect(createLookup(peopleFound).findAuthor(sourceOn("gh"), "@nobody")).resolves.toBeNull()
  })

  it("does not find a forge user when the forge has a problem", async () => {
    const lookup = createLookup(adapterFinding(async () => await Promise.reject(new GitAdapterError("offline", "network"))))

    await expect(lookup.findAuthor(sourceOn("gh"), "@octo")).resolves.toBeNull()
  })
})
