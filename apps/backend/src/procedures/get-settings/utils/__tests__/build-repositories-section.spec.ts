import { buildRepositoriesSection } from "@/procedures/get-settings/utils/build-repositories-section"
import { DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { SELF_AUTHOR_HINT } from "@/procedures/get-setup/utils/build-repositories-step"

const STOREFRONT = { name: "storefront", path: "/Users/dev/projects/storefront" }
const CHECKOUT_API = { name: "checkout api", path: "/Users/dev/projects/checkout-api" }

describe("buildRepositoriesSection", () => {
  it("shows the user git config names in place of the user picked by hand", () => {
    const section = buildRepositoriesSection([
      {
        repository: STOREFRONT,
        authors: { selfAuthor: DEV, trackedAuthors: [] },
        forge: "git",
        identity: { name: "Lena Okafor", email: "lena@acme.example" },
      },
    ])

    expect(section.repositories).toMatchObject([
      {
        selfAuthor: {
          author: { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", monogram: "LO" },
          stateLabel: null,
          isChangeable: false,
        },
      },
    ])
  })

  it("lists each repository as setup step 1 draws it, with its configurations link and the users followed in it", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: DEV, trackedAuthors: [LENA] }, forge: "git", identity: null },
    ])

    expect(section).toStrictEqual({
      section: "repositories",
      repositories: [
        {
          name: "storefront",
          path: "/Users/dev/projects/storefront",
          lineColor: "blue",
          lineLabel: "S",
          authorSearchHint: "You see your own branches. Add team members to see theirs too.",
          authorSearchPlaceholder: "Type a name or email",
          selfAuthor: { hint: SELF_AUTHOR_HINT, author: { ...DEV, monogram: "DH" }, stateLabel: "You", isChangeable: true },
          trackedAuthors: [{ ...LENA, monogram: "LO" }],
          configurationHref: "/pr-reviews/storefront/configurations",
          emptyMessage: null,
        },
      ],
    })
  })

  it("gives each repository the line colour of its place and an encoded link", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: null, trackedAuthors: [LENA] }, forge: "gh", identity: null },
      { repository: CHECKOUT_API, authors: { selfAuthor: null, trackedAuthors: [LENA] }, forge: "gh", identity: null },
    ])

    expect(section.repositories.map((repository) => repository.lineColor)).toStrictEqual(["blue", "green"])
    expect(section.repositories[1]?.configurationHref).toBe("/pr-reviews/checkout%20api/configurations")
  })

  it("says what Flight Plan lists when a repository has no team member picked, by the forge that serves it", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: null, trackedAuthors: [] }, forge: "gh", identity: null },
      { repository: { ...STOREFRONT, name: "ledger-api" }, authors: { selfAuthor: DEV, trackedAuthors: [] }, forge: "git", identity: null },
    ])

    expect(section.repositories.map((repository) => repository.emptyMessage)).toStrictEqual([
      "No team members are picked, so Flight Plan follows everyone in this repository.",
      "No team members are picked, so Flight Plan lists only the branches you add to this repository.",
    ])
  })

  it("lists no repository when Flight Plan follows none", () => {
    expect(buildRepositoriesSection([])).toStrictEqual({ section: "repositories", repositories: [] })
  })
})
