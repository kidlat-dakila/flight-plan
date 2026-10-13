import { createMockProcedureContext } from "@/procedures/context"
import { searchReviewers } from "@/procedures/search-reviewers"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("searchReviewers", () => {
  it("offers the people who match and are neither the author nor reviewers already", async () => {
    await expect(searchReviewers({ ...DISCUSSED_KEY, query: "" }, createContext())).resolves.toStrictEqual([
      { login: "lena", name: "lena", detail: "@lena", avatarUrl: null, monogram: "L" },
    ])
    await expect(searchReviewers({ ...DISCUSSED_KEY, query: "le" }, createContext())).resolves.toMatchObject([{ login: "lena" }])
  })

  it("reports nothing for a branch", async () => {
    await expect(searchReviewers({ ...BRANCH_KEY, query: "" }, createContext())).resolves.toBeNull()
  })
})
