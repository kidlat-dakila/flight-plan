import { closeAgent } from "@/procedures/close-agent"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import {
  createConversationContext,
  FakeSpawner,
  flushPromises,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { handleAgentExit } from "@/procedures/handle-agent-exit"

const startAgent = async (spawner = new FakeSpawner()) => {
  const setup = createConversationContext({ spawner })
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Why?")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

describe("handleAgentExit", () => {
  it("records what the terminal showed when the agent stops on its own", async () => {
    const { context, environment, spawner } = await startAgent(new FakeSpawner({ output: "Please run /login" }))

    spawner.processes[0]?.exit(1)
    await flushPromises()

    expect(environment.agents.find(KEY)).toBeNull()
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({
      kind: "agent-failure",
      reason: "Claude stopped before it finished (exit code 1). Its terminal last showed: Please run /login",
    })
    expect(context.conversationEnvironment).toBe(environment)
  })

  it("starts the agent again after a closed turn when a reply arrived meanwhile", async () => {
    const { context, environment, spawner } = await startAgent()
    await appendAndPublish(KEY, [reviewerMessage("m2", "One more")], context)

    closeAgent(KEY, "turn-ended", context)
    await flushPromises()

    expect(spawner.launches).toHaveLength(2)
    expect(spawner.launches[1]?.prompt).toBe("The reviewer wrote:\nOne more")
    expect(environment.agents.find(KEY)?.phase).toBe("starting")
  })

  it("does not start the agent again after a shutdown", async () => {
    const { context, spawner } = await startAgent()
    await appendAndPublish(KEY, [reviewerMessage("m2", "One more")], context)

    closeAgent(KEY, "shutdown", context)
    await flushPromises()

    expect(spawner.launches).toHaveLength(1)
  })

  it("ignores the exit of a session that no longer holds the review target", async () => {
    const { context } = createConversationContext()

    await expect(handleAgentExit({ key: KEY, sessionId: "gone", exitCode: 0 }, context)).resolves.toStrictEqual({ shouldRedeliver: false })
  })
})
