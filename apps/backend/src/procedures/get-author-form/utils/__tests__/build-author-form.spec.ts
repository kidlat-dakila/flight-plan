import { buildAuthorForm } from "@/procedures/get-author-form/utils/build-author-form"

const IDENTITY = { name: "Dev Harper", email: "dev@acme.example" }

describe("buildAuthorForm", () => {
  it("asks the user to pick themselves from the commit authors when local git serves the repository and git config has no email", () => {
    expect(buildAuthorForm("git", null)).toStrictEqual({
      selfAuthorHint: "Git has no email set for you in this repository, so Flight Plan can't tell which commits are yours. Search for the name or email you commit with and pick yourself.",
      gitSelfAuthor: null,
      searchHint: "Ask Flight Plan to look for branches made by your team members.",
      searchPlaceholder: "Type a name or email",
    })
  })

  it("shows the user from git config instead of asking, when git config has the user's email", () => {
    expect(buildAuthorForm("git", IDENTITY)).toMatchObject({
      selfAuthorHint: null,
      gitSelfAuthor: {
        author: { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" },
        stateLabel: "You, from git config",
      },
    })
  })

  it("leaves the user out and searches the forge when a forge serves the repository", () => {
    expect(buildAuthorForm("gh", null)).toStrictEqual({
      selfAuthorHint: null,
      gitSelfAuthor: null,
      searchHint: "Ask Flight Plan to look for pull requests made by your team members.",
      searchPlaceholder: "Type a name or username",
    })
  })
})
