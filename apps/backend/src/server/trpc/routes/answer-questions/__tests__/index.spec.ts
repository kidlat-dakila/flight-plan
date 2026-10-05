import { agentQuestion, createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("conversation.answerQuestions route", () => {
  it("delegates to the answer-questions procedure", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [agentQuestion("q1")])
    const caller = appRouter.createCaller(context)

    await expect(
      caller.conversation.answerQuestions({ ...KEY, batchId: "q1", answers: [{ questionId: "q1-1", pickedLabels: ["By feature"], text: null }] }),
    ).resolves.toStrictEqual({ kind: "accepted" })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)
    const input = { ...KEY, batchId: "q1", answers: [], isFinal: true }

    await expect(caller.conversation.answerQuestions(input)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
