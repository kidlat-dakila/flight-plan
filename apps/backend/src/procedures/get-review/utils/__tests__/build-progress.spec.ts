import type { JournalEntry } from "@/procedures/get-conversation/utils/conversation"
import { buildCompletionNotice, buildProgress, NO_WRITING_ACTIVITY, type WritingActivity } from "@/procedures/get-review/utils/build-progress"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { createArtifact, createSegment, createWaypoint } from "./review-fixture"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const createRequest = (writer: ReviewRequest["writer"]): ReviewRequest => ({
  configurationId: "standard",
  preset: "standard",
  order: "foundations-first",
  customOrder: null,
  writer,
  requestedAt: NOW,
})

const CLAUDE_REQUEST = createRequest({ kind: "agent", agent: "claude", model: "sonnet", effort: "high" })
const EXTERNAL_REQUEST = createRequest({ kind: "external", agent: "codex" })
const NO_AGENT_REQUEST = createRequest({ kind: "none" })

const FAILURE: JournalEntry = { sequence: 2, event: { kind: "agent-failure", id: "failure-1", reason: "The claude command was not found.", failedAt: NOW } }
const DELIVERY: JournalEntry = { sequence: 3, event: { kind: "delivery", id: "delivery-1", throughSequence: 1, channel: "spawn", deliveredAt: NOW } }

const permissionAsked = (sequence: number, batchId: string, command: string): JournalEntry => ({
  sequence,
  event: {
    kind: "question-batch",
    id: batchId,
    origin: "permission",
    questions: [{ id: `${batchId}-1`, prompt: "Allow the agent to use Bash?", detail: command, options: [], allowsMultiple: false }],
    askedAt: NOW,
  },
})

const permissionAnswered = (sequence: number, batchId: string): JournalEntry => ({
  sequence,
  event: { kind: "answers", id: `${batchId}-answers`, batchId, origin: "permission", answers: [], answeredAt: NOW },
})

const drafting = createArtifact({ status: "drafting" })
const unwritten = createArtifact({
  status: "drafting",
  segments: [createSegment({ title: "", context: "", walkthrough: { files: [{ path: "src/price.ts", waypoints: [createWaypoint("w1", "priceOf", { title: null, reading: "" })] }] } })],
})

const activityOf = (overrides: Partial<WritingActivity>): WritingActivity => ({ ...NO_WRITING_ACTIVITY, ...overrides })

describe("buildProgress", () => {
  it("has nothing to show when the author writes the Flight Plan, because nothing is being written for them", () => {
    const request = createRequest({ kind: "author", start: "scaffold" })

    expect(buildProgress(unwritten, activityOf({ request, prompt: "Review it." }))).toBeNull()
  })

  it("has nothing to show for an artifact that is complete", () => {
    expect(buildProgress(createArtifact(), activityOf({ request: CLAUDE_REQUEST, isAgentRunning: true }))).toBeNull()
  })

  it("counts the parts that need nothing more out of every part the agent writes", () => {
    const written = buildProgress(drafting, NO_WRITING_ACTIVITY)
    const empty = buildProgress(unwritten, NO_WRITING_ACTIVITY)

    expect(written?.writtenCount).toBe(written?.totalCount)
    expect(empty).toMatchObject({ writtenCount: 0, countLabel: `0 of ${String(empty?.totalCount)} parts written` })
    expect(empty?.totalCount).toBeGreaterThan(0)
  })

  it("names the agent while it runs, and shows what is unwritten as being written", () => {
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, isAgentRunning: true }))).toMatchObject({
      state: "writing",
      label: "Claude is writing the review",
      isWriting: true,
      prompt: null,
    })
  })

  it("says the agent stopped when it is not running and the review is not finished, and how to start it again", () => {
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST }))).toMatchObject({
      state: "stopped",
      label: "Claude stopped before the review was finished",
      message: "Send it a message in Chat to start it again.",
      isWriting: false,
    })
  })

  it("gives the reason when the last start of the agent failed, and none once a later start worked", () => {
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, journal: [FAILURE] }))).toMatchObject({
      state: "stopped",
      label: "Claude could not write the review",
      message: "The claude command was not found. Send it a message in Chat to start it again.",
    })
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, journal: [FAILURE, DELIVERY] }))).toMatchObject({
      label: "Claude stopped before the review was finished",
    })
  })

  it("asks the reviewer about the agent's latest permission request that is still open while it runs", () => {
    const journal = [permissionAsked(4, "batch-1", "rg priceOf"), permissionAnswered(5, "batch-1"), permissionAsked(6, "batch-2", "git log -1")]

    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, isAgentRunning: true, journal }))?.permission).toStrictEqual({
      batchId: "batch-2",
      questionId: "batch-2-1",
      title: "Allow the agent to use Bash?",
      description: "The agent is waiting for your answer before it goes on writing the review.",
      detail: "git log -1",
      allowLabel: "Allow",
      denyLabel: "Deny",
      reasonLabel: "Tell the agent why, if you deny it",
    })
  })

  it("asks nothing once the request is answered, or when the agent no longer runs", () => {
    const answered = [permissionAsked(4, "batch-1", "rg priceOf"), permissionAnswered(5, "batch-1")]
    const open = [permissionAsked(4, "batch-1", "rg priceOf")]

    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, isAgentRunning: true, journal: answered }))?.permission).toBeNull()
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, journal: open }))?.permission).toBeNull()
  })

  it("waits for the agent the reviewer starts, with the line to copy again, until a part is written", () => {
    const activity = activityOf({ request: EXTERNAL_REQUEST, prompt: "Review pull request #412." })

    expect(buildProgress(unwritten, activity)).toMatchObject({
      state: "waiting",
      label: "Waiting for your agent",
      isWriting: true,
      prompt: { label: "Copy the line", text: "Review pull request #412.", copiedMessage: "Line copied" },
    })
    expect(buildProgress(drafting, activity)).toMatchObject({ state: "writing", label: "Your agent is writing the review" })
  })
})

describe("buildProgress without an agent", () => {
  it("shows no progress for a review built without an agent", () => {
    expect(buildProgress(unwritten, activityOf({ request: NO_AGENT_REQUEST, prompt: null }))).toBeNull()
  })
})

describe("buildCompletionNotice", () => {
  it("announces a complete artifact by its title, and nothing while it is drafting", () => {
    expect(buildCompletionNotice(createArtifact())).toStrictEqual({
      title: "Flight Plan Review ready",
      body: "Count held units is ready to read.",
    })
    expect(buildCompletionNotice(drafting)).toBeNull()
  })
})
