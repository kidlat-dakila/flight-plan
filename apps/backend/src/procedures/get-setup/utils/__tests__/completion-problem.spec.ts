import { AT_REPOSITORIES, CHECKOUT_WEB, DEV, GITHUB_FORGES } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import {
  findCompletionProblem,
  findRepositoriesProblem,
  findRepositoryAuthorsProblem,
} from "@/procedures/get-setup/utils/completion-problem"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("findRepositoryAuthorsProblem", () => {
  it("asks for the user's own author when no forge account tells who they are", () => {
    expect(findRepositoryAuthorsProblem(CHECKOUT_WEB, true)).toBe("Pick which user you are in checkout-web.")
  })

  it("accepts a repository whose user is chosen on local git, with nobody else tracked", () => {
    expect(findRepositoryAuthorsProblem({ ...CHECKOUT_WEB, selfAuthor: DEV }, true)).toBeNull()
  })

  it("accepts a repository on a forge with nobody tracked, since Flight Plan then follows everyone", () => {
    expect(findRepositoryAuthorsProblem(CHECKOUT_WEB, false)).toBeNull()
  })
})

describe("findRepositoriesProblem", () => {
  it("asks for a repository first", () => {
    expect(findRepositoriesProblem(EMPTY_SETUP, {}, {})).toBe("Add at least one repository.")
  })

  it("lets the repositories step pass before any later step is saved", () => {
    const withCheckoutWeb = { ...EMPTY_SETUP, repositories: [{ ...CHECKOUT_WEB, selfAuthor: DEV }] }

    expect(findRepositoriesProblem(withCheckoutWeb, {}, {})).toBeNull()
  })
})

describe("findCompletionProblem", () => {
  const withCheckoutWeb = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

  it("asks for the user's own author in a repository that local git serves", () => {
    expect(findCompletionProblem(withCheckoutWeb, { [CHECKOUT_WEB.path]: "git" }, {})).toBe(
      "Pick which user you are in checkout-web.",
    )
  })

  it("finishes with nobody tracked in a repository a forge serves, even when the default forge is local git", () => {
    expect(findCompletionProblem(withCheckoutWeb, { [CHECKOUT_WEB.path]: "gh" }, {})).toBeNull()
  })

  it("asks for the user's own author in a repository local git serves, even when the default forge is a forge", () => {
    const forgeDefault = { ...withCheckoutWeb, forges: GITHUB_FORGES }

    expect(findCompletionProblem(forgeDefault, { [CHECKOUT_WEB.path]: "git" }, {})).toBe(
      "Pick which user you are in checkout-web.",
    )
  })

  it("needs no chosen user in a repository local git serves when git config has the user's email", () => {
    const identities = { [CHECKOUT_WEB.path]: { name: null, email: "dev@acme.example" } }

    expect(findCompletionProblem(withCheckoutWeb, { [CHECKOUT_WEB.path]: "git" }, identities)).toBeNull()
  })

  it("falls back to the default forge for a repository whose forge is not known", () => {
    expect(findCompletionProblem(withCheckoutWeb, {}, {})).toBe("Pick which user you are in checkout-web.")
  })
})
