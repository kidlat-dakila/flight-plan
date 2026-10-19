import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { writeUpReview } from "@/procedures/write-up-review"
import type { WriteUpReviewInput } from "@/procedures/write-up-review/utils/schemas"
import type { ReviewArtifact } from "@flightplan/configurations"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const CLAUDE_SETUP = {
  ...EMPTY_SETUP,
  agents: { installs: [{ agent: "claude", installPath: "/home/.claude", model: "opus", effort: "max" }], defaultAgent: "claude" },
} as const

const UNREQUIRED_ARTIFACT: ReviewArtifact = {
  ...WALKTHROUGH_ONLY_ARTIFACT,
  status: "complete",
  segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({
    ...segment,
    isContextRequired: false,
    walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, isRequired: false })) })) },
  })),
}

const INPUT: WriteUpReviewInput = {
  ...KEY,
  sections: ["walkthrough", "findings"],
  configurationId: "minimal",
  walkthroughOrder: "important-first",
  isSegmented: false,
}

const createWritingContext = async (spawner = new FakeSpawner(), artifact: ReviewArtifact = UNREQUIRED_ARTIFACT): Promise<ProcedureContext> => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold(KEY, {
    artifact,
    baseCommit: "0000000",
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return {
    ...createMockProcedureContext(NOW),
    reviewStore,
    setupStore: new InMemorySetupStore(CLAUDE_SETUP),
    conversationEnvironment: createConversationEnvironment({ spawners: { claude: spawner.spawn }, newId: new SequentialIds().next }),
    now: () => NOW,
  }
}

describe("writeUpReview", () => {
  it("requires the chosen sections, keeps the choice with the review and starts the setup's agent", async () => {
    const spawner = new FakeSpawner()
    const context = await createWritingContext(spawner)

    await expect(writeUpReview(INPUT, context)).resolves.toStrictEqual({ kind: "started", prompt: null, message: "Review started" })

    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact).toMatchObject({ status: "drafting", isSegmented: false })
    expect(artifact?.segments.flatMap(waypointsOf).every(({ waypoint }) => waypoint.isRequired)).toBe(true)
    expect(artifact?.segments.every((segment) => !segment.isContextRequired)).toBe(true)
    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({
      configurationId: "minimal",
      preset: "minimal",
      writer: { kind: "agent", agent: "claude", model: "opus", effort: "max" },
      writeUp: { sections: ["walkthrough", "findings"], walkthroughOrder: "important-first" },
    })
    expect(spawner.launches[0]?.prompt).toContain("Write up the parts of the Code Walkthrough that Flight Plan marked as required, and nothing else.")
    expect(spawner.launches[0]?.prompt).toContain("Check the code of every waypoint for findings.")
  })

  it("tells the agent to write no findings when the reviewer did not choose them", async () => {
    const spawner = new FakeSpawner()
    const context = await createWritingContext(spawner)

    await writeUpReview({ ...INPUT, sections: ["context"] }, context)

    expect(spawner.launches[0]?.prompt).toContain("Write no findings: the reviewer did not ask for them.")
  })

  it("refuses an empty choice, a configuration that does not exist and a review with no agent set up", async () => {
    const context = await createWritingContext()

    await expect(writeUpReview({ ...INPUT, sections: [] }, context)).resolves.toMatchObject({ kind: "rejected", field: "sections" })
    await expect(writeUpReview({ ...INPUT, configurationId: "custom-gone" }, context)).resolves.toMatchObject({ kind: "rejected", field: "configuration" })
    await expect(writeUpReview(INPUT, { ...context, setupStore: new InMemorySetupStore(EMPTY_SETUP) })).resolves.toMatchObject({ kind: "rejected", field: "agent" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "complete" })
  })

  it("starts no agent when everything chosen is already written", async () => {
    const spawner = new FakeSpawner()
    const written = { ...UNREQUIRED_ARTIFACT, segments: UNREQUIRED_ARTIFACT.segments.map((segment) => ({ ...segment, context: "This segment rounds once.", title: "Rounding" })) }
    const context = await createWritingContext(spawner, written)

    await expect(writeUpReview({ ...INPUT, sections: ["context"] }, context)).resolves.toStrictEqual({ kind: "written", message: "Everything you chose is already written up." })
    expect(spawner.launches).toStrictEqual([])
  })
})
