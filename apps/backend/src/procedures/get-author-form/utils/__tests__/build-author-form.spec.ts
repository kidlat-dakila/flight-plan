import { buildAuthorForm } from "@/procedures/get-author-form/utils/build-author-form"

const IDENTITY = { name: "Dev Harper", email: "dev@acme.example" }

describe("buildAuthorForm", () => {
  it("shows no user when local git serves the repository and git config has no email", () => {
    expect(buildAuthorForm("git", null, "storefront")).toStrictEqual({
      gitSelfAuthor: null,
      searchHint: "By default, Flight Plan lists only the branches you add. Add your teammates here to see their branches and yours too.",
      searchPlaceholder: "Type a name or email",
    })
  })

  it("shows the user from git config, when git config has the user's email", () => {
    expect(buildAuthorForm("git", IDENTITY, "storefront")).toMatchObject({
      gitSelfAuthor: {
        author: { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" },
      },
    })
  })

  it("leaves the user out and searches the forge when a forge serves the repository", () => {
    expect(buildAuthorForm("gh", null, "storefront")).toStrictEqual({
      gitSelfAuthor: null,
      searchHint: "By default, Flight Plan shows everyone's pull requests in storefront. To see only your teammates' pull requests and yours, add them here.",
      searchPlaceholder: "Type a name or username",
    })
  })
})
