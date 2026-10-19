import { createMockProcedureContext } from "@/procedures/context"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { isPublishingUnderway } from "@/procedures/publish-artifact/utils/publishing-progress"
import { recordPublication } from "@/procedures/record-publication"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const URL = "https://claude.ai/artifact/abc123"

const createContext = () => ({ ...createMockProcedureContext(NOW), now: () => NOW })

describe("recordPublication", () => {
  it("records the artifact's address and when it was published", async () => {
    const context = createContext()

    await expect(recordPublication({ ...KEY, url: URL }, context)).resolves.toMatchObject({ kind: "recorded" })
    await expect(context.reviewStore.readPublications(KEY)).resolves.toStrictEqual([{ kind: "claude", url: URL, publishedAt: NOW }])
  })

  it("ends the publishing that was underway", async () => {
    const context = createContext()
    await context.reviewStore.writePublishingRequest(KEY, { requestedAt: NOW, channel: "listener" })

    await recordPublication({ ...KEY, url: URL }, context)

    const [request, publications] = await Promise.all([context.reviewStore.readPublishingRequest(KEY), context.reviewStore.readPublications(KEY)])
    expect(isPublishingUnderway(request, publications, false, NOW)).toBe(false)
  })

  it("replaces the address recorded before", async () => {
    const context = createContext()
    await recordPublication({ ...KEY, url: URL }, context)

    await recordPublication({ ...KEY, url: "https://claude.ai/artifact/def456" }, context)

    await expect(context.reviewStore.readPublications(KEY)).resolves.toMatchObject([{ url: "https://claude.ai/artifact/def456" }])
  })

  it("rejects an address that is not a Claude artifact's", async () => {
    const context = createContext()

    await expect(recordPublication({ ...KEY, url: "https://example.com/page" }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.readPublications(KEY)).resolves.toStrictEqual([])
  })

  it("rejects a review target with no Flight Plan", async () => {
    await expect(recordPublication({ ...KEY, targetId: "pr-416", url: URL }, createContext())).resolves.toMatchObject({ kind: "rejected" })
  })

  it("asks for one more publish when the page gains its link back to Flight Plan, and not when the address is unchanged", async () => {
    const context = createContext()
    await context.reviewStore.writeScaffold(KEY, {
      artifact: WEBHOOK_RETRY_ARTIFACT,
      baseCommit: "0000000",
      request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
    })

    const first = await recordPublication({ ...KEY, url: URL }, context)
    const second = await recordPublication({ ...KEY, url: URL }, context)

    expect(first.kind).toBe("recorded")
    expect(JSON.stringify(first)).toContain("publish it once more")
    expect(JSON.stringify(first)).toContain("flight-plan.json")
    expect(second).toStrictEqual({ kind: "recorded", note: "Recorded. The reviewer now sees the link under Share." })
  })
})
