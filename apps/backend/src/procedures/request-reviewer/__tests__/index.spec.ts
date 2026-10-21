import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { requestReviewer } from "@/procedures/request-reviewer"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readReviewers = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...DISCUSSED_KEY, filterKeys: [], isShowingReviewed: false }, context)
  return page?.shell.header.kind === "pull-request" ? page.shell.header.reviewers : []
}

describe("requestReviewer", () => {
  it("adds the person to the reviewers as requested", async () => {
    const context = createContext()

    await expect(requestReviewer({ ...DISCUSSED_KEY, login: "lena" }, context)).resolves.toStrictEqual({ kind: "done" })
    expect(await readReviewers(context)).toMatchObject([
      { name: "jonas" },
      { name: "amara" },
      { name: "teo" },
      { name: "lena", state: "pending", request: { login: "lena", isRemoving: true } },
    ])
  })

  it("asks a reviewer who already reviewed for another review", async () => {
    const context = createContext()

    await requestReviewer({ ...DISCUSSED_KEY, login: "jonas" }, context)

    expect((await readReviewers(context)).find((reviewer) => reviewer.name === "jonas")).toMatchObject({ state: "pending" })
  })

  it("reports nothing for a branch", async () => {
    await expect(requestReviewer({ ...BRANCH_KEY, login: "lena" }, createContext())).resolves.toBeNull()
  })
})
