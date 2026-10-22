import { buildCompletionNotice, buildProgress, isWritingNow, NO_WRITING_ACTIVITY, type WritingActivity } from "@/procedures/get-review/utils/build-progress"
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
    expect(buildProgress(createArtifact(), activityOf({ request: CLAUDE_REQUEST, isAgentOnline: true }))).toBeNull()
  })

  it("counts the parts that need nothing more out of every part the agent writes", () => {
    const written = buildProgress(drafting, NO_WRITING_ACTIVITY)
    const empty = buildProgress(unwritten, NO_WRITING_ACTIVITY)

    expect(written?.writtenCount).toBe(written?.totalCount)
    expect(empty).toMatchObject({ writtenCount: 0, countLabel: `0 of ${String(empty?.totalCount)} parts written` })
    expect(empty?.totalCount).toBeGreaterThan(0)
  })

  it("names the agent while it is online, and shows what is unwritten as being written", () => {
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST, isAgentOnline: true }))).toMatchObject({
      state: "writing",
      label: "Claude is writing the review",
      isWriting: true,
      prompt: null,
    })
  })

  it("waits for the agent while it is offline, and draws nothing as being written", () => {
    expect(buildProgress(unwritten, activityOf({ request: CLAUDE_REQUEST }))).toMatchObject({
      state: "waiting",
      label: "Waiting for Claude",
      message: "Claude writes the review once it is online. You can read the code meanwhile.",
      isWriting: false,
    })
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

describe("isWritingNow", () => {
  const draftingArtifact = createArtifact({ status: "drafting" })

  it("is writing while a drafting review's agent is online, or while the reviewer's own agent writes it", () => {
    expect(isWritingNow(draftingArtifact, activityOf({ request: CLAUDE_REQUEST, isAgentOnline: true }))).toBe(true)
    expect(isWritingNow(draftingArtifact, activityOf({ request: EXTERNAL_REQUEST, isAgentOnline: false }))).toBe(true)
  })

  it("is not writing while the agent is offline, with no agent, or once the review is complete", () => {
    expect(isWritingNow(draftingArtifact, activityOf({ request: CLAUDE_REQUEST, isAgentOnline: false }))).toBe(false)
    expect(isWritingNow(draftingArtifact, activityOf({ request: NO_AGENT_REQUEST, isAgentOnline: false }))).toBe(false)
    expect(isWritingNow(createArtifact({ status: "complete" }), activityOf({ request: CLAUDE_REQUEST, isAgentOnline: true }))).toBe(false)
  })
})
