import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { requestQueuedWriteUps } from "@/procedures/request-queued-write-ups"
import type { Waypoint } from "@flightplan/configurations"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const W3 = { kind: "waypoint", waypointId: "w3" } as const

const createQueueContext = async (): Promise<ProcedureContext> => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold(KEY, {
    artifact: { ...WALKTHROUGH_ONLY_ARTIFACT, status: "complete" },
    baseCommit: "0000000",
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return {
    ...createMockProcedureContext(NOW),
    reviewStore,
    conversationEnvironment: createConversationEnvironment({ newId: new SequentialIds().next }),
    now: () => NOW,
  }
}

const writeWaypoint = async (context: ProcedureContext, waypointId: string): Promise<void> => {
  await context.reviewStore.amendArtifact(KEY, (artifact) => ({
    artifact: {
      ...artifact,
      segments: artifact.segments.map((segment) => ({
        ...segment,
        walkthrough: {
          files: segment.walkthrough.files.map((file) => ({
            ...file,
            waypoints: file.waypoints.map((waypoint): Waypoint => (waypoint.id === waypointId ? { ...waypoint, title: "Written", reading: "Written." } : waypoint)),
          })),
        },
      })),
    },
    outcome: null,
  }))
}

const reviewerMessagesOf = async (context: ProcedureContext): Promise<readonly string[]> =>
  (await context.conversationEnvironment.store.read(KEY)).journal.flatMap(({ event }) => (event.kind === "reviewer-message" ? [event.body] : []))

describe("requestQueuedWriteUps", () => {
  it("asks for a queued waypoint that is still unwritten and empties the queue", async () => {
    const context = await createQueueContext()
    context.conversationEnvironment.writeUpQueue.add(KEY, W3)

    await expect(requestQueuedWriteUps(KEY, context)).resolves.toBe(true)
    const messages = await reviewerMessagesOf(context)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("The reviewer asks for the write-up of the waypoint `w3` alone")
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "drafting" })
    expect(context.conversationEnvironment.writeUpQueue.take(KEY)).toStrictEqual([])
  })

  it("asks for nothing when the agent already wrote the queued waypoint", async () => {
    const context = await createQueueContext()
    context.conversationEnvironment.writeUpQueue.add(KEY, W3)
    await writeWaypoint(context, "w3")

    await expect(requestQueuedWriteUps(KEY, context)).resolves.toBe(false)
    await expect(reviewerMessagesOf(context)).resolves.toStrictEqual([])
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "complete" })
  })

  it("keeps the queue while an agent is still running", async () => {
    const context = await createQueueContext()
    const { agents, writeUpQueue } = context.conversationEnvironment
    writeUpQueue.add(KEY, W3)
    agents.claim({ key: KEY, agent: "claude", sessionId: "session", process: null, phase: "running", startedAt: NOW, lastActivityAt: NOW, closing: null, isAwaitingPermission: false, wasReminded: false })

    await expect(requestQueuedWriteUps(KEY, context)).resolves.toBe(false)
    expect(writeUpQueue.take(KEY)).toStrictEqual([W3])
  })
})
