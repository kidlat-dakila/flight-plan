import { addComment } from "@/procedures/add-comment"
import { createMockProcedureContext } from "@/procedures/context"
import { discardComment } from "@/procedures/discard-comment"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const SUBTOTAL_PATH = "src/cart/subtotal.ts"
const ADDED_LINE = { path: SUBTOTAL_PATH, side: "new" as const, startLine: 7, endLine: 7 }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("discardComment", () => {
  it("drops the pending comment and keeps the others", async () => {
    const context = createContext()
    await addComment({ ...KEY, position: ADDED_LINE, body: "First.", shouldPostNow: false }, context)
    await addComment({ ...KEY, position: ADDED_LINE, body: "Second.", shouldPostNow: false }, context)
    const firstId = (await context.reviewStore.readPendingComments(KEY)).find((pending) => pending.body === "First.")?.id ?? ""

    await expect(discardComment({ ...KEY, commentId: firstId }, context)).resolves.toBe(true)
    await expect(context.reviewStore.readPendingComments(KEY)).resolves.toMatchObject([{ body: "Second." }])
  })

  it("says so when there is no such pending comment", async () => {
    await expect(discardComment({ ...KEY, commentId: "gone" }, createContext())).resolves.toBe(false)
  })
})
