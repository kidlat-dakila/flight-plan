import { deliverToAgent } from "@/procedures/deliver-to-agent"
import {
  createConversationContext,
  FakeSpawner,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { InMemoryAgentRegistry } from "@/procedures/get-conversation/utils/agent-registry"
import type { AgentSpawner } from "@/procedures/get-conversation/utils/conversation-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("deliverToAgent", () => {
  it("does nothing when no reply waits", async () => {
    const { context, spawner } = createConversationContext()

    await expect(deliverToAgent(KEY, context)).resolves.toStrictEqual({ kind: "nothing-pending" })
    expect(spawner.launches).toStrictEqual([])
  })

  it("resumes the session it saved instead of starting a new one", async () => {
    const { context, spawner, environment } = createConversationContext()
    await environment.store.saveSessionId(KEY, "saved-session")
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])

    await expect(deliverToAgent(KEY, context)).resolves.toStrictEqual({ kind: "spawned", sessionId: "saved-session" })
    expect(spawner.launches[0]).toMatchObject({ sessionId: "saved-session", isResume: true })
  })

  it("keeps the reply waiting and records why when the agent cannot start", async () => {
    const spawner = new FakeSpawner({ failure: "The claude command was not found on this machine." })
    const { context, environment } = createConversationContext({ spawner })
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])

    await expect(deliverToAgent(KEY, context)).resolves.toStrictEqual({
      kind: "failed",
      reason: "The claude command was not found on this machine.",
    })
    const { journal } = await environment.store.read(KEY)
    expect(journal.map(({ event }) => event.kind)).toStrictEqual(["reviewer-message", "agent-failure"])
    expect(environment.agents.find(KEY)).toBeNull()
  })

  it("records that the setup has no agent to start", async () => {
    const { context, environment } = createConversationContext({ setup: EMPTY_SETUP })
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])

    await expect(deliverToAgent(KEY, context)).resolves.toMatchObject({ kind: "unavailable" })
    const { journal } = await environment.store.read(KEY)
    expect(journal.at(-1)?.event).toMatchObject({ kind: "agent-failure", reason: "Finish the Agents step of the setup so Flight Plan can start an agent." })
  })

  it("leaves the reply for a session that is listening", async () => {
    const { context, spawner, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    environment.agents.openListener(KEY)

    await expect(deliverToAgent(KEY, context)).resolves.toStrictEqual({ kind: "listener-waiting" })
    expect(spawner.launches).toStrictEqual([])
  })

  it("stops a process that came up after its review target was closed", async () => {
    const spawner = new FakeSpawner()
    const agents = new InMemoryAgentRegistry()
    const closingSpawner: AgentSpawner = async (launch, onExit) => {
      agents.update(KEY, (agent) => ({ ...agent, closing: "shutdown" }))
      return await spawner.spawn(launch, onExit)
    }
    const { context, environment } = createConversationContext({ spawner, spawners: { claude: closingSpawner }, agents })
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])

    await deliverToAgent(KEY, context)

    expect(spawner.processes[0]?.stopCount).toBe(1)
  })
})
