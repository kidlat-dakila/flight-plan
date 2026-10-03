import { AT_REPOSITORIES, CHECKOUT_WEB, DEV, GITHUB_FORGES, LENA } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { findCompletionProblem, findRepositoryAuthorsProblem } from "@/procedures/get-setup/utils/completion-problem"

describe("findRepositoryAuthorsProblem", () => {
  it("asks for the user's own author when no forge account tells who they are", () => {
    expect(findRepositoryAuthorsProblem(CHECKOUT_WEB, true)).toBe("Pick which user you are in checkout-web.")
  })

  it("accepts a repository whose user is chosen on local git, with nobody else tracked", () => {
    expect(findRepositoryAuthorsProblem({ ...CHECKOUT_WEB, selfAuthor: DEV }, true)).toBeNull()
  })

  it("asks for a tracked user when a forge account tells who the user is", () => {
    expect(findRepositoryAuthorsProblem(CHECKOUT_WEB, false)).toBe("Track at least one user in checkout-web.")
  })

  it("accepts a repository with a tracked user on a forge", () => {
    expect(findRepositoryAuthorsProblem({ ...CHECKOUT_WEB, trackedAuthors: [LENA] }, false)).toBeNull()
  })
})

describe("findCompletionProblem", () => {
  const withCheckoutWeb = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

  it("asks for the user's own author in a repository that local git serves", () => {
    expect(findCompletionProblem(withCheckoutWeb, { [CHECKOUT_WEB.path]: "git" })).toBe(
      "Pick which user you are in checkout-web.",
    )
  })

  it("asks for a tracked user in a repository a forge serves, even when the default forge is local git", () => {
    expect(findCompletionProblem(withCheckoutWeb, { [CHECKOUT_WEB.path]: "gh" })).toBe(
      "Track at least one user in checkout-web.",
    )
  })

  it("asks for the user's own author in a repository local git serves, even when the default forge is a forge", () => {
    const forgeDefault = { ...withCheckoutWeb, forges: GITHUB_FORGES }

    expect(findCompletionProblem(forgeDefault, { [CHECKOUT_WEB.path]: "git" })).toBe(
      "Pick which user you are in checkout-web.",
    )
  })

  it("falls back to the default forge for a repository whose forge is not known", () => {
    expect(findCompletionProblem(withCheckoutWeb, {})).toBe("Pick which user you are in checkout-web.")
  })
})
