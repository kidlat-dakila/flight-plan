import { buildAuthorForm } from "@/procedures/get-author-form/utils/build-author-form"

describe("buildAuthorForm", () => {
  it("asks the user to pick themselves from the commit authors when local git serves the repository", () => {
    expect(buildAuthorForm("git")).toStrictEqual({
      selfAuthorHint: "Git cannot tell who you are here. Search for the name or email you commit with, then pick yourself.",
      searchHint: "Search by name or email. The people who committed most recently come first.",
      searchPlaceholder: "Type a name or email",
    })
  })

  it("leaves the user out and searches the forge when a forge serves the repository", () => {
    expect(buildAuthorForm("gh")).toStrictEqual({
      selfAuthorHint: null,
      searchHint: "Search by name or username. Results come from GitHub CLI.",
      searchPlaceholder: "Type a name or username",
    })
  })
})
