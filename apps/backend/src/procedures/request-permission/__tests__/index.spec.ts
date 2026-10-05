import { answerQuestions } from "@/procedures/answer-questions"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import {
  createConversationContext,
  flushPromises,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { PERMISSION_WAIT_MS, requestPermission } from "@/procedures/request-permission"

const startAgent = async () => {
  const setup = createConversationContext()
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Run the tests")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

const answer = async (context: Parameters<typeof answerQuestions>[1], pickedLabels: readonly string[], text: string | null) => {
  const { journal } = await context.conversationEnvironment.store.read(KEY)
  const batch = journal.at(-1)?.event
  const batchId = batch?.kind === "question-batch" ? batch.id : ""
  return await answerQuestions({ ...KEY, batchId, answers: [{ questionId: `${batchId}-1`, pickedLabels: [...pickedLabels], text }] }, context)
}

describe("requestPermission", () => {
  it("asks the reviewer and allows the call once the reviewer allows it", async () => {
    const { context, environment } = await startAgent()

    const deciding = requestPermission({ sessionId: "id-1", toolName: "Bash", toolInput: { command: "npm test" } }, context)
    await flushPromises()
    expect(environment.agents.find(KEY)?.isAwaitingPermission).toBe(true)
    await answer(context, ["Allow"], null)

    await expect(deciding).resolves.toStrictEqual({ kind: "allow" })
    expect(environment.agents.find(KEY)?.isAwaitingPermission).toBe(false)
  })

  it("denies the call with the reviewer's reason", async () => {
    const { context } = await startAgent()

    const deciding = requestPermission({ sessionId: "id-1", toolName: "Bash", toolInput: { command: "rm -rf build" } }, context)
    await flushPromises()
    await answer(context, ["Deny"], "Not the build folder.")

    await expect(deciding).resolves.toStrictEqual({ kind: "deny", message: "The reviewer denied this. Not the build folder." })
  })

  it("refuses and withdraws the question when the reviewer does not answer in time", async () => {
    const { context, environment, clock } = await startAgent()
    const deciding = requestPermission({ sessionId: "id-1", toolName: "Bash", toolInput: {} }, context)
    await flushPromises()
    clock.advance(PERMISSION_WAIT_MS + 1)
    environment.hub.publish(KEY)

    await expect(deciding).resolves.toStrictEqual({
      kind: "deny",
      message: "The reviewer did not answer in time, so this was refused.",
    })
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "questions-withdrawn", reason: "The agent stopped waiting for an answer." })
  })

  it("makes no decision for a session Flight Plan did not start", async () => {
    const { context } = createConversationContext()

    await expect(requestPermission({ sessionId: "other", toolName: "Bash", toolInput: {} }, context)).resolves.toStrictEqual({ kind: "unknown-session" })
  })
})
