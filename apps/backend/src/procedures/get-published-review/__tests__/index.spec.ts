import { createMockProcedureContext } from "@/procedures/context"
import { getPublishedReview } from "@/procedures/get-published-review"
import { publishedReviewSchema } from "@/procedures/get-published-review/utils/schemas"
import { getReview } from "@/procedures/get-review"
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
      getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context),
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
})
