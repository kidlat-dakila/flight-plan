import { createMockProcedureContext } from "@/procedures/context"
import { getPublishedReview } from "@/procedures/get-published-review"
import { publishedReviewSchema } from "@/procedures/get-published-review/utils/schemas"
import { getReview } from "@/procedures/get-review"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { setReviewed } from "@/procedures/set-reviewed"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(NOW)

describe("getPublishedReview", () => {
  it("returns the Flight Plan as a page that matches its schema", async () => {
    const review = await getPublishedReview(KEY, createContext())

    expect(publishedReviewSchema.safeParse(review).success).toBe(true)
    expect(review?.header).toMatchObject({ isBranch: false, label: "Published Flight Plan" })
    expect(review?.segments.length).toBeGreaterThan(0)
  })

  it("holds the same code links as the review page", async () => {
    const context = createContext()
    const [review, page] = await Promise.all([
      getPublishedReview(KEY, context),
      getReview({ ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }, context),
    ])

    expect(Object.keys(review?.codeLinks ?? {})).toStrictEqual(Object.keys(page?.kind === "artifact" ? page.codeLinks : {}))
  })

  it("leaves out what the forge and the reviewer added", async () => {
    const context = createContext()
    const path = (await getPublishedReview(KEY, context))?.segments.at(0)?.walkthrough.files.at(0)?.path ?? ""
    await setReviewed({ ...KEY, subject: { kind: "file", path }, isReviewed: true }, context)

    const review = await getPublishedReview(KEY, context)

    const files = review?.segments.flatMap((segment) => segment.walkthrough.files) ?? []
    expect(path).not.toBe("")
    expect(files.flatMap((file) => file.threads)).toStrictEqual([])
    expect(files.some((file) => file.isReviewed)).toBe(false)
    expect(JSON.stringify(review)).not.toContain("avatarUrl")
  })

  it("returns nothing for a review target with no Flight Plan, or one that is not listed", async () => {
    await expect(getPublishedReview({ ...KEY, targetId: "pr-416" }, createContext())).resolves.toBeNull()
    await expect(getPublishedReview({ ...KEY, targetId: "pr-9999" }, createContext())).resolves.toBeNull()
  })

  it("says how to install Flight Plan where a control needs it", async () => {
    await expect(getPublishedReview(KEY, createContext())).resolves.toMatchObject({
      unavailableFeature: {
        title: "Only available in Flight Plan",
        install: {
          commands: [
            { label: "Run it without installing", command: "npx @kidlat-dakila/flightplan@latest" },
            { label: "Or install it once, then start it with flightplan", command: "npm install -g @kidlat-dakila/flightplan@latest" },
          ],
          copyLabel: "Copy command",
          copiedLabel: "Copied",
        },
      },
    })
  })

  it("links back to Flight Plan once it has a stored Flight Plan and the address of its Claude artifact", async () => {
    const context = createContext()

    await expect(getPublishedReview(KEY, context)).resolves.toMatchObject({ importLink: null })

    await context.reviewStore.writeScaffold(KEY, {
      artifact: WEBHOOK_RETRY_ARTIFACT,
      baseCommit: "0000000",
      request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
    })
    await context.reviewStore.writePublications(KEY, [{ kind: "claude", url: "https://claude.ai/artifact/abc", publishedAt: NOW }])

    await expect(getPublishedReview(KEY, context)).resolves.toMatchObject({
      importLink: {
        label: "Download to Flight Plan",
        href: "http://localhost:4200/artifact/claude/download?artifact=https%3A%2F%2Fclaude.ai%2Fartifact%2Fabc&repository=storefront&target=pr-405",
      },
    })
  })
})
