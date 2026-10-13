import { isPublishingUnderway } from "@/procedures/publish-artifact/utils/publishing-progress"

const REQUESTED_AT = new Date("2026-10-01T12:00:00.000Z")
const SOON_AFTER = new Date("2026-10-01T12:01:00.000Z")
const MUCH_LATER = new Date("2026-10-01T12:11:00.000Z")
const AGENT_REQUEST = { requestedAt: REQUESTED_AT, channel: "agent" } as const
const LISTENER_REQUEST = { requestedAt: REQUESTED_AT, channel: "listener" } as const

describe("isPublishingUnderway", () => {
  it("is not underway when nothing was requested", () => {
    expect(isPublishingUnderway(null, [], true, SOON_AFTER)).toBe(false)
  })

  it("is underway while the agent Flight Plan started still runs", () => {
    expect(isPublishingUnderway(AGENT_REQUEST, [], true, MUCH_LATER)).toBe(true)
    expect(isPublishingUnderway(AGENT_REQUEST, [], false, SOON_AFTER)).toBe(false)
  })

  it("waits ten minutes for a session the reviewer started", () => {
    expect(isPublishingUnderway(LISTENER_REQUEST, [], false, SOON_AFTER)).toBe(true)
    expect(isPublishingUnderway(LISTENER_REQUEST, [], false, MUCH_LATER)).toBe(false)
  })

  it("ends when the artifact's address is recorded after the request, not by an earlier publication", () => {
    const earlier = [{ kind: "claude" as const, url: "old", publishedAt: new Date("2026-10-01T09:00:00.000Z") }]
    const recorded = [{ kind: "claude" as const, url: "new", publishedAt: SOON_AFTER }]

    expect(isPublishingUnderway(AGENT_REQUEST, earlier, true, SOON_AFTER)).toBe(true)
    expect(isPublishingUnderway(AGENT_REQUEST, recorded, true, SOON_AFTER)).toBe(false)
  })
})
