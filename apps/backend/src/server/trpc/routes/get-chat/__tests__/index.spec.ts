import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.chat and review.sendChatMessage routes", () => {
  it("delegate to the chat procedures", async () => {
    const caller = createCaller()

    await expect(caller.review.sendChatMessage({ ...KEY, body: "Why?", reference: null })).resolves.toStrictEqual({
      messageId: "question-1",
    })
    await expect(caller.review.chat(KEY)).resolves.toMatchObject({ messages: [{ id: "question-1" }, { id: "question-1-answer" }] })
  })

  it("reject a message with no text", async () => {
    await expect(createCaller().review.sendChatMessage({ ...KEY, body: " ", reference: null })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })
})
