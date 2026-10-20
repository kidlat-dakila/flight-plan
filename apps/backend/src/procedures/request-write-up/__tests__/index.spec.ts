import { closeAgent } from "@/procedures/close-agent"
import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { requestWriteUp } from "@/procedures/request-write-up"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const CLAUDE_SETUP: Setup = {
  ...EMPTY_SETUP,
  agents: { installs: [{ agent: "claude", installPath: "/home/.claude", model: "opus", effort: "max" }], defaultAgent: "claude" },
}

const createWritingContext = async (spawner = new FakeSpawner(), setup: Setup = CLAUDE_SETUP): Promise<ProcedureContext> => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold(KEY, {
    artifact: { ...WALKTHROUGH_ONLY_ARTIFACT, status: "complete" },
    baseCommit: "0000000",
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return {
    ...createMockProcedureContext(NOW),
    reviewStore,
    setupStore: new InMemorySetupStore(setup),
    conversationEnvironment: createConversationEnvironment({ spawners: { claude: spawner.spawn }, newId: new SequentialIds().next }),
    now: () => NOW,
  }
}

describe("requestWriteUp", () => {
  it("asks the setup's agent for the write-up of one waypoint and makes the review drafting", async () => {
    const spawner = new FakeSpawner()
    const context = await createWritingContext(spawner)

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)).resolves.toStrictEqual({
      kind: "started",
      prompt: null,
      message: "Writing up 1 waypoint",
    })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.status).toBe("drafting")
    expect(artifact?.segments.flatMap(waypointsOf).find(({ waypoint }) => waypoint.id === "w2")?.waypoint.isRequired).toBe(true)
    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({ writer: { kind: "agent", agent: "claude" } })
    expect(spawner.launches[0]?.prompt).toContain("The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else.")
  })

  it("queues the write-up while an agent is running and asks for it once the agent exits", async () => {
    const spawner = new FakeSpawner()
    const context = await createWritingContext(spawner)
    await requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w3" } }, context)).resolves.toStrictEqual({
      kind: "queued",
      message: "The agent is still writing. If this is still missing when it finishes, Flight Plan asks for it next.",
    })
    expect(spawner.launches).toHaveLength(1)
    const { journal } = await context.conversationEnvironment.store.read(KEY)
    expect(journal.filter(({ event }) => event.kind === "reviewer-message")).toHaveLength(1)

    closeAgent(KEY, "turn-ended", context)

    await vi.waitFor(() => {
      expect(spawner.launches).toHaveLength(2)
    })
    expect(spawner.launches[1]?.prompt).toContain("The reviewer asks for the write-up of the waypoint `w3` alone")
  })

  it("refuses when no agent is set up", async () => {
    const context = await createWritingContext(new FakeSpawner(), { ...CLAUDE_SETUP, agents: null })

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)).resolves.toMatchObject({ kind: "rejected", field: "agent" })
  })

  it("says why when the agent could not start", async () => {
    const context = await createWritingContext(new FakeSpawner({ failure: "The claude command was not found on this machine." }))

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)).resolves.toMatchObject({
      kind: "started",
      message: "The agent did not start: The claude command was not found on this machine.",
    })
  })
})
