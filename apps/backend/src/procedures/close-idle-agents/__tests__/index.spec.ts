import { closeAllAgents } from "@/procedures/close-all-agents"
import { closeIdleAgents } from "@/procedures/close-idle-agents"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import {
  createConversationContext,
  FakeSpawner,
  flushPromises,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { recordAgentActivity } from "@/procedures/record-agent-activity"

const startAgent = async (spawner = new FakeSpawner()) => {
  const setup = createConversationContext({ spawner })
  await setup.environment.store.append(KEY, [reviewerMessage("m1", "Why?")])
  await deliverToAgent(KEY, setup.context)
  return setup
}

describe("closeIdleAgents", () => {
  it("closes an agent that never started and says what its terminal showed", async () => {
    const { context, environment, clock, spawner } = await startAgent(new FakeSpawner({ output: "Do you trust the files in this folder?" }))
    clock.advance(91_000)

    await expect(closeIdleAgents(context)).resolves.toBe(1)
    await flushPromises()

    expect(spawner.processes[0]?.stopCount).toBe(1)
    expect(environment.agents.find(KEY)).toBeNull()
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({
      kind: "agent-failure",
      reason: "Claude did not start within 90 seconds, so Flight Plan closed it. Its terminal last showed: Do you trust the files in this folder?",
    })
    expect(spawner.launches).toHaveLength(1)
  })

  it("closes a running agent after ten quiet minutes and leaves a busy one", async () => {
    const { context, clock, spawner } = await startAgent()
    await recordAgentActivity({ sessionId: "id-1" }, context)
    clock.advance(300_000)

    await expect(closeIdleAgents(context)).resolves.toBe(0)
    clock.advance(301_000)
    await expect(closeIdleAgents(context)).resolves.toBe(1)
    expect(spawner.processes[0]?.stopCount).toBe(1)
  })
})

describe("closeAllAgents", () => {
  it("stops every running agent", async () => {
    const { context, spawner } = await startAgent()

    expect(closeAllAgents(context)).toBe(1)
    expect(spawner.processes[0]?.stopCount).toBe(1)
  })
})
