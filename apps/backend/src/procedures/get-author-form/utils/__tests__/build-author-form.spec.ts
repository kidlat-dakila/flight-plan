import { buildAuthorForm } from "@/procedures/get-author-form/utils/build-author-form"

const IDENTITY = { name: "Dev Harper", email: "dev@acme.example" }

describe("buildAuthorForm", () => {
  it("shows no user when local git serves the repository and git config has no email", () => {
    expect(buildAuthorForm("git", null, "storefront")).toStrictEqual({
      gitSelfAuthor: null,
      searchHint: "Flight Plan will show all pull requests by default. However, you can choose to show only pull requests from your teammates (and from you).",
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
      searchHint: "By default, Flight Plan shows every branch in storefront. To see only your teammates' pull requests, add them here.",
      searchPlaceholder: "Type a name or username",
    })
  })
})
