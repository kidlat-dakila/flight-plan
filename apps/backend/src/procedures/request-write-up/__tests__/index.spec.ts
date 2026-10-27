import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
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
  agents: { installs: [{ agent: "claude", installPath: "/home/.claude", model: "opus", effort: "max" }], defaultAgent: "claude", terminalApp: "terminal" },
}

const createWritingContext = async (setup: Setup = CLAUDE_SETUP): Promise<ProcedureContext> => {
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
    conversationEnvironment: createConversationEnvironment({ newId: new SequentialIds().next }),
    now: () => NOW,
  }
}

const lastRequestOf = async (context: ProcedureContext): Promise<string> => {
  const { journal } = await context.conversationEnvironment.store.read(KEY)
  const event = journal.at(-1)?.event
  return event?.kind === "reviewer-message" ? event.body : ""
}

describe("requestWriteUp", () => {
  it("asks the setup's agent for the write-up of one waypoint and makes the review drafting", async () => {
    const context = await createWritingContext()

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)).resolves.toStrictEqual({
      kind: "started",
      prompt: null,
      message: "Explaining 1 waypoint",
    })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.status).toBe("drafting")
    expect(artifact?.segments.flatMap(waypointsOf).find(({ waypoint }) => waypoint.id === "w2")?.waypoint.isRequired).toBe(true)
    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({ writer: { kind: "agent", agent: "claude" } })
    await expect(lastRequestOf(context)).resolves.toContain("The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else.")
  })

  it("leaves every request for the live agent, one after the other", async () => {
    const context = await createWritingContext()
    await requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w3" } }, context)).resolves.toMatchObject({ kind: "started" })
    await expect(lastRequestOf(context)).resolves.toContain("The reviewer asks for the write-up of the waypoint `w3` alone")
  })

  it("refuses when no agent is set up", async () => {
    const context = await createWritingContext({ ...CLAUDE_SETUP, agents: null })

    await expect(requestWriteUp({ ...KEY, target: { kind: "waypoint", waypointId: "w2" } }, context)).resolves.toMatchObject({ kind: "rejected", field: "agent" })
  })
})
