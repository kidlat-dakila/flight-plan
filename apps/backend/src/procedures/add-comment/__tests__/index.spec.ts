import { addComment } from "@/procedures/add-comment"
import { createMockProcedureContext } from "@/procedures/context"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("addComment", () => {
  it("stores the comment as pending, so the review reads it back", async () => {
    const context = createContext()

    await expect(
      addComment({ ...KEY, threadId: null, location: { path: "src/cart/subtotal.ts", line: 7 }, body: "Round here?" }, context),
    ).resolves.toStrictEqual({ threadId: "thread-1" })
    await expect(context.reviewStore.readDiscussion(KEY)).resolves.toMatchObject({
      threads: [{ line: 7, comments: [{ body: "Round here?", isPending: true }] }],
    })
  })

  it("reports nothing for a review target it does not know or a thread that is gone", async () => {
    await expect(
      addComment({ repositoryName: "gone", targetId: "pr-1", threadId: null, location: null, body: "Hello" }, createContext()),
    ).resolves.toBeNull()
    await expect(addComment({ ...KEY, threadId: "thread-9", location: null, body: "Hello" }, createContext())).resolves.toBeNull()
  })
})
