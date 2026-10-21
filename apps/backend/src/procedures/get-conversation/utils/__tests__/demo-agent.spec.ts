import { createDemoProcedureContext } from "@/procedures/context"
import { SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import type { DemoReview } from "@/procedures/get-review/utils/mocks/demo-reviews"
import { HELD_STOCK_ARTIFACT } from "@/procedures/get-review/utils/mocks/held-stock"
import { writeUpReview } from "@/procedures/write-up-review"
import type { ReviewArtifact } from "@flightplan/configurations"

const NOW = new Date("2026-10-14T12:00:00.000Z")
const KEY = { repositoryName: "orders-web", targetId: "pr-128" }
const REPLY_DELAY_MS = 2_000
const SCRIPTED_REPLY = "This is a demo, so my replies are written in advance."

const EXPLAINED_ARTIFACT: ReviewArtifact = {
  ...HELD_STOCK_ARTIFACT,
  segments: HELD_STOCK_ARTIFACT.segments.map((segment) => ({
    ...segment,
    blastDiagram: null,
    walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, findings: [] })) })) },
  })),
}

const DEMO: DemoReview = {
  name: "demo-react",
  targets: [{ title: "Implement three pages", branch: "three-pages", artifact: EXPLAINED_ARTIFACT }],
  story: {
    repository: { name: KEY.repositoryName, forgeSlug: "acme/orders-web" },
    pullRequest: { number: 128, author: "mira", updatedMinutesAgo: 25 },
    reviewers: [],
    comments: [],
    threads: [],
    reviews: [],
    chat: [],
    agentReplies: [SCRIPTED_REPLY],
    avatars: {},
  },
}

const agentMessagesOf = (journal: readonly { readonly event: { readonly kind: string, readonly body?: string } }[]): readonly (string | undefined)[] =>
  journal.filter((entry) => entry.event.kind === "agent-message").map((entry) => entry.event.body)

describe("demo agent", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("answers a request to explain the review with its scripted reply, and leaves the review complete", async () => {
    const context = await createDemoProcedureContext([DEMO], NOW, new SequentialIds().next)

    const started = await writeUpReview(
      { ...KEY, sections: ["findings"], configurationId: "standard", walkthroughOrder: "important-first", isSegmented: true },
      context,
    )
    const drafting = await context.reviewStore.findArtifact(KEY)
    await vi.advanceTimersByTimeAsync(REPLY_DELAY_MS)
    const finished = await context.reviewStore.findArtifact(KEY)
    const { journal } = await context.conversationEnvironment.store.read(KEY)

    expect(started?.kind).toBe("started")
    expect(drafting?.status).toBe("drafting")
    expect(finished?.status).toBe("complete")
    expect(agentMessagesOf(journal)).toStrictEqual([SCRIPTED_REPLY])
  })
})
