import { buildRepositoryConfiguration } from "@/procedures/get-repository-configuration/utils/build-repository-configuration"
import { CHECKOUT_WEB, DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const LISTED = { name: CHECKOUT_WEB.name, path: CHECKOUT_WEB.path }

describe("buildRepositoryConfiguration", () => {
  it("shows the saved user and tracked users of a repository local git serves, with the form to change them", () => {
    expect(buildRepositoryConfiguration(LISTED, { selfAuthor: DEV, trackedAuthors: [LENA] }, "git", null)).toStrictEqual({
      name: "checkout-web",
      path: "/Users/dev/projects/checkout-web",
      form: {
        selfAuthorHint: "Git has no email for you in this repository. Search for the name or email you commit with and pick yourself.",
        gitSelfAuthor: null,
        searchHint: "You see your own branches. Add team members to see theirs too.",
        searchPlaceholder: "Type a name or email",
      },
      selfAuthor: { ...DEV, monogram: "DH" },
      trackedAuthors: [{ ...LENA, monogram: "LO" }],
    })
  })

  it("has no user to choose in a repository a forge serves", () => {
    expect(buildRepositoryConfiguration(LISTED, { selfAuthor: null, trackedAuthors: [LENA] }, "gh", null)).toMatchObject({
      form: { selfAuthorHint: null, searchPlaceholder: "Type a name or username" },
      selfAuthor: null,
    })
  })
})
