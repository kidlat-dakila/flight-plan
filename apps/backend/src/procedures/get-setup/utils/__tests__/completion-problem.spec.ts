import { AT_REPOSITORIES, CHECKOUT_WEB } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { findCompletionProblem, findRepositoriesProblem } from "@/procedures/get-setup/utils/completion-problem"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("findRepositoriesProblem", () => {
  it("asks for a repository first", () => {
    expect(findRepositoriesProblem(EMPTY_SETUP)).toBe("Add at least one repository.")
  })

  it("lets the repositories step pass with nobody picked, before any later step is saved", () => {
    expect(findRepositoriesProblem({ ...EMPTY_SETUP, repositories: [CHECKOUT_WEB] })).toBeNull()
  })
})

describe("findCompletionProblem", () => {
  it("finishes with nobody picked, since git config tells who the user is", () => {
    expect(findCompletionProblem({ ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] })).toBeNull()
  })
})
