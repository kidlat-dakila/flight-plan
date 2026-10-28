import { buildRepositoryConfiguration } from "@/procedures/get-repository-configuration/utils/build-repository-configuration"
import { CHECKOUT_WEB, DEV, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"

const LISTED = { name: CHECKOUT_WEB.name, path: CHECKOUT_WEB.path, baseBranch: "develop" }

describe("buildRepositoryConfiguration", () => {
  it("shows the tracked users of a repository local git serves, with the form to change them", () => {
    expect(buildRepositoryConfiguration(LISTED, { selfAuthor: DEV, trackedAuthors: [LENA] }, "git", null)).toStrictEqual({
      name: "checkout-web",
      path: "/Users/dev/projects/checkout-web",
      form: {
        gitSelfAuthor: null,
        searchHint: "By default, Flight Plan lists only the branches you add. Add your teammates here to see their branches and yours too.",
        searchPlaceholder: "Type a name or email",
      },
      trackedAuthors: [{ ...LENA, monogram: "LO" }],
      baseBranch: "develop",
    })
  })

  it("searches the forge in a repository a forge serves", () => {
    expect(buildRepositoryConfiguration(LISTED, { selfAuthor: null, trackedAuthors: [LENA] }, "gh", null)).toMatchObject({
      form: { searchHint: "By default, Flight Plan shows everyone's pull requests in checkout-web. To see only your teammates' pull requests and yours, add them here.", searchPlaceholder: "Type a name or username" },
    })
  })
})
