import { attachThreads, threadLinesOfFile, type Discussion } from "@/procedures/get-review/utils/discussion"
import type { WalkthroughBand } from "@flightplan/configurations"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const ONE_HOUR_MS = 3_600_000
const PRICE_PATH = "src/price.ts"
const CART_PATH = "src/cart.ts"

const discussion: Discussion = {
  reviews: [],
  threads: [
    {
      id: "thread-1",
      path: PRICE_PATH,
      line: 2,
      comments: [
        { id: "comment-1", author: "amara", body: "Why `rates`?", createdAt: new Date(NOW.getTime() - ONE_HOUR_MS), isPending: true },
      ],
    },
    { id: "thread-2", path: PRICE_PATH, line: null, comments: [] },
  ],
}

const createFile = (path: string): WalkthroughBand["files"][number] => ({
  anchorId: `file-${path}`,
  path,
  title: path,
  isDraft: true,
  isReviewed: false,
  reviewLabel: "File reviewed",
  summary: [],
  waypointCountLabel: "0 waypoints",
  forgeLink: null,
  rows: [],
})

const band: WalkthroughBand = {
  anchorId: "code-walkthrough",
  heading: "Code Walkthrough",
  intro: null,
  coverageLabel: "All 2 changed files",
  emptyMessage: null,
  files: [createFile(PRICE_PATH), createFile(CART_PATH)],
  fileOrder: [],
}

describe("attachThreads", () => {
  it("gives each file the comment threads on its lines", () => {
    const [priceFile, cartFile] = attachThreads(band, discussion, NOW).files

    expect(priceFile.threads).toMatchObject([
      {
        id: "thread-1",
        lineLabel: "2",
        comments: [{ author: { name: "amara", monogram: "A" }, timeLabel: "1 hour ago", pendingLabel: "Pending" }],
      },
    ])
    expect(cartFile.threads).toStrictEqual([])
  })

  it("keeps everything else of the band as it was", () => {
    const discussed = attachThreads(band, discussion, NOW)

    expect(discussed).toMatchObject({ anchorId: "code-walkthrough", coverageLabel: "All 2 changed files" })
    expect(discussed.files.map((file) => file.path)).toStrictEqual([PRICE_PATH, CART_PATH])
  })
})

describe("threadLinesOfFile", () => {
  it("lists the lines a file's threads are on, and leaves out a thread with no line", () => {
    expect(threadLinesOfFile(discussion, PRICE_PATH)).toStrictEqual([2])
    expect(threadLinesOfFile(discussion, CART_PATH)).toStrictEqual([])
  })
})
