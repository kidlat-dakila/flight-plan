import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { removeReviewRequest } from "@/procedures/remove-review-request"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readReviewers = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...DISCUSSED_KEY, filterKeys: [], isShowingReviewed: false }, context)
  return page?.shell.header.kind === "pull-request" ? page.shell.header.reviewers : []
}

describe("removeReviewRequest", () => {
  it("takes the person off the reviewers", async () => {
    const context = createContext()

    await expect(removeReviewRequest({ ...DISCUSSED_KEY, login: "teo" }, context)).resolves.toStrictEqual({ kind: "done" })
    expect((await readReviewers(context)).map((reviewer) => reviewer.name)).toStrictEqual(["jonas", "amara"])
  })

  it("reports nothing for a branch", async () => {
    await expect(removeReviewRequest({ ...BRANCH_KEY, login: "teo" }, createContext())).resolves.toBeNull()
  })
})
