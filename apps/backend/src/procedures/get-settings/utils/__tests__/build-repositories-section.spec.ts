import { buildRepositoriesSection } from "@/procedures/get-settings/utils/build-repositories-section"
import { DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const STOREFRONT = { name: "storefront", path: "/Users/dev/projects/storefront" }
const CHECKOUT_API = { name: "checkout api", path: "/Users/dev/projects/checkout-api" }

describe("buildRepositoriesSection", () => {
  it("lists each repository with its line, its folder and the users followed in it", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: DEV, trackedAuthors: [LENA] } },
    ])

    expect(section).toStrictEqual({
      section: "repositories",
      repositories: [
        {
          name: "storefront",
          path: "/Users/dev/projects/storefront",
          lineColor: "blue",
          lineLabel: "S",
          configurationHref: "/pr-reviews/storefront/configurations",
          selfAuthor: { ...DEV, monogram: "DH" },
          trackedAuthors: [{ ...LENA, monogram: "LO" }],
          emptyMessage: null,
        },
      ],
      emptyMessage: null,
    })
  })

  it("gives each repository the line colour of its place and an encoded link", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: null, trackedAuthors: [LENA] } },
      { repository: CHECKOUT_API, authors: { selfAuthor: null, trackedAuthors: [LENA] } },
    ])

    expect(section.repositories.map((repository) => repository.lineColor)).toStrictEqual(["blue", "green"])
    expect(section.repositories[1]?.configurationHref).toBe("/pr-reviews/checkout%20api/configurations")
  })

  it("says that everyone is followed when a repository has no team member picked, even with the user chosen", () => {
    const section = buildRepositoriesSection([
      { repository: STOREFRONT, authors: { selfAuthor: null, trackedAuthors: [] } },
      { repository: { ...STOREFRONT, name: "ledger-api" }, authors: { selfAuthor: DEV, trackedAuthors: [] } },
    ])

    expect(section.repositories.map((repository) => repository.emptyMessage)).toStrictEqual([
      "No team members are picked, so Flight Plan follows everyone in this repository.",
      "No team members are picked, so Flight Plan follows everyone in this repository.",
    ])
  })

  it("says so when there is no repository", () => {
    expect(buildRepositoriesSection([])).toStrictEqual({
      section: "repositories",
      repositories: [],
      emptyMessage: "No repositories yet. Add one to start.",
    })
  })
})
