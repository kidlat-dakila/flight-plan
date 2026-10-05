import { answerQuestions } from "@/procedures/answer-questions"
import { agentQuestion, createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"

const ANSWER = { questionId: "q1-1", pickedLabels: ["By layer"], text: null }

describe("answerQuestions", () => {
  it("keeps the answers and resumes the agent with them", async () => {
    const { context, spawner, environment } = createConversationContext()
    await environment.store.append(KEY, [agentQuestion("q1")])

    await expect(answerQuestions({ ...KEY, batchId: "q1", answers: [ANSWER] }, context)).resolves.toStrictEqual({ kind: "accepted" })
    expect(spawner.launches[0]?.prompt).toBe(
      "The reviewer answered your questions (q1):\n- How should I organise the walkthrough?\n  By layer",
    )
  })

  it("answers a permission request without starting an agent", async () => {
    const { context, spawner, environment } = createConversationContext()
    await environment.store.append(KEY, [agentQuestion("p1", "permission")])

    await answerQuestions({ ...KEY, batchId: "p1", answers: [{ ...ANSWER, questionId: "p1-1" }] }, context)

    expect(spawner.launches).toStrictEqual([])
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "answers", origin: "permission" })
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
