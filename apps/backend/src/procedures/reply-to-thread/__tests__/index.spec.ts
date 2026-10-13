import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { replyToThread } from "@/procedures/reply-to-thread"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const BRANCH_KEY = { repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readThreads = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...DISCUSSED_KEY, filterKeys: null, isShowingReviewed: false }, context)
  if (page?.kind !== "artifact") throw new Error("The sample review is not written.")
  return page.segments.flatMap((segment) => segment.walkthrough.files).flatMap((file) => file.threads)
}

describe("replyToThread", () => {
  it("posts the reply to the thread right away", async () => {
    const context = createContext()

    await expect(replyToThread({ ...DISCUSSED_KEY, threadId: "thread-2", body: "It does." }, context)).resolves.toStrictEqual({ kind: "done" })

    const thread = (await readThreads(context)).find((candidate) => candidate.id === "thread-2")
    expect(thread?.comments).toMatchObject([{ author: { name: "jonas" } }, { author: { name: "you" }, pendingLabel: null }])
  })

  it("passes on the refusal for a thread that is gone, and reports nothing for a branch", async () => {
    await expect(replyToThread({ ...DISCUSSED_KEY, threadId: "thread-9", body: "Hello" }, createContext())).resolves.toMatchObject({
      kind: "refused",
    })
    await expect(replyToThread({ ...BRANCH_KEY, threadId: "thread-1", body: "Hello" }, createContext())).resolves.toBeNull()
  })
})
