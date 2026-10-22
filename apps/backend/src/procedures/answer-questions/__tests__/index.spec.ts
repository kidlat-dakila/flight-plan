import { answerQuestions } from "@/procedures/answer-questions"
import { agentQuestion, createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { pendingInboundOf } from "@/procedures/get-conversation/utils/conversation"

const ANSWER = { questionId: "q1-1", pickedLabels: ["By layer"], text: null }

describe("answerQuestions", () => {
  it("keeps the answers for the live agent to pick up", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [agentQuestion("q1")])

    await expect(answerQuestions({ ...KEY, batchId: "q1", answers: [ANSWER] }, context)).resolves.toStrictEqual({ kind: "accepted" })
    const { journal } = await environment.store.read(KEY)
    expect(pendingInboundOf(journal).map(({ event }) => event.kind)).toStrictEqual(["answers"])
  })

  it("returns the problem with an answer and keeps nothing", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [agentQuestion("q1")])

    await expect(answerQuestions({ ...KEY, batchId: "q1", answers: [] }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Pick an option or write an answer for: How should I organise the walkthrough?",
      questionId: "q1-1",
    })
    await expect(answerQuestions({ ...KEY, batchId: "q1", answers: [ANSWER] }, context)).resolves.toStrictEqual({ kind: "accepted" })
    await expect(answerQuestions({ ...KEY, batchId: "q1", answers: [ANSWER] }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
