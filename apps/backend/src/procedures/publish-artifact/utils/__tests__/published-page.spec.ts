import { createMockProcedureContext } from "@/procedures/context"
import { getPublishedReview } from "@/procedures/get-published-review"
import type { PublishedReview } from "@/procedures/get-published-review/utils/schemas"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { formatPublishedPage } from "@/procedures/publish-artifact/utils/published-page"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const ASSIGNMENT = "globalThis.flightPlanReview = "

const SCAFFOLD: ReviewScaffold = {
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") },
}

const readReview = async (): Promise<PublishedReview> => {
  const review = await getPublishedReview(KEY, createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))
  if (review === null) throw new Error("The sample review is missing.")
  return review
}

describe("formatPublishedPage", () => {
  it("writes a page that loads its style, the review and then the app from files beside it", async () => {
    const { html } = formatPublishedPage(await readReview(), null)

    expect(html).toContain("<script src=\"review-data.js\"></script>")
    expect(html.indexOf("<script src=\"app.js\"></script>")).toBeGreaterThan(html.indexOf("<script src=\"review-data.js\"></script>"))
    expect(html).toContain("<link rel=\"stylesheet\" href=\"app.css\" />")
  })

  it("escapes the title", async () => {
    const { html } = formatPublishedPage({ ...(await readReview()), documentTitle: "Fix <b> & \"quotes\"" }, null)

    expect(html).toContain("<title>Fix &lt;b&gt; &amp; &quot;quotes&quot;</title>")
  })

  it("writes the review as a script that holds all of it", async () => {
    const review = await readReview()

    const { reviewScript } = formatPublishedPage(review, null)

    expect(reviewScript.startsWith(ASSIGNMENT)).toBe(true)
    expect(JSON.parse(reviewScript.slice(ASSIGNMENT.length))).toStrictEqual(review)
  })

  it("writes the stored Flight Plan as a file that reads back as the same Flight Plan", async () => {
    const { flightPlanFile } = formatPublishedPage(await readReview(), SCAFFOLD)

    expect(parseStoredReview(flightPlanFile ?? "")).toStrictEqual(SCAFFOLD)
    expect(JSON.parse(flightPlanFile ?? "null")).not.toBeNull()
  })

  it("has no Flight Plan file without a stored Flight Plan", async () => {
    expect(formatPublishedPage(await readReview(), null).flightPlanFile).toBeNull()
  })
})
