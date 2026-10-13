import { buildReviewDraft, rangeLabelOf, staleCommentsOf, threadLinesOfFile, type DiscussionSource } from "@/procedures/get-review/utils/discussion"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const PRICE_PATH = "src/price.ts"
const CART_PATH = "src/cart.ts"
const COMMIT = "abc1234"

const lineAt = (side: "old" | "new", startLine: number, endLine = startLine, path = PRICE_PATH) => ({ path, side, startLine, endLine })

const pending = (id: string, commit: string, position = lineAt("new", 20)) => ({ id, position, body: "Mine.", createdAt: NOW, commit })

const thread = (id: string, position: ReturnType<typeof lineAt> | null) => ({
  id,
  path: PRICE_PATH,
  position,
  isResolved: false,
  isOutdated: position === null,
  comments: [],
})

const source: DiscussionSource = {
  discussion: {
    comments: [],
    threads: [thread("range", lineAt("new", 2, 4)), thread("removed", lineAt("old", 9)), thread("outdated", null)],
    reviews: [],
  },
  pendingComments: [pending("current", COMMIT), pending("stale", "0000000", lineAt("new", 30))],
  viewer: { name: "you", avatarUrl: null },
  abilities: { verdicts: ["comment"], canReply: true, canResolve: true, canRequestReviewers: true, canRequestAgain: true },
  commit: COMMIT,
  now: NOW,
}

describe("threadLinesOfFile", () => {
  it("lists every new line a thread or a current pending comment covers, and no removed or outdated one", () => {
    expect(threadLinesOfFile(source, PRICE_PATH)).toStrictEqual([2, 3, 4, 20])
    expect(threadLinesOfFile(source, CART_PATH)).toStrictEqual([])
    expect(threadLinesOfFile(null, PRICE_PATH)).toStrictEqual([])
  })
})

describe("rangeLabelOf", () => {
  it("names a range and a removed line, and nothing for one new line", () => {
    expect(rangeLabelOf(lineAt("new", 4))).toBeNull()
    expect(rangeLabelOf(lineAt("new", 4, 9))).toBe("Lines 4–9")
    expect(rangeLabelOf(lineAt("old", 4))).toBe("Removed line 4")
    expect(rangeLabelOf(lineAt("old", 4, 9))).toBe("Removed lines 4–9")
  })
})

describe("staleCommentsOf", () => {
  it("picks the pending comments written against another commit", () => {
    expect(staleCommentsOf(source.pendingComments, COMMIT).map((comment) => comment.id)).toStrictEqual(["stale"])
  })
})

describe("buildReviewDraft", () => {
  it("counts every pending comment and offers the verdicts the code host takes", () => {
    expect(buildReviewDraft(source, null)).toMatchObject({
      isAvailable: true,
      buttonLabel: "Submit review (2)",
      pendingLabel: "2 pending comments will be sent with it.",
      verdicts: [{ key: "comment" }],
    })
  })

  it("is unavailable with its reason, and offers no verdict, without a discussion", () => {
    expect(buildReviewDraft(null, "A branch without a code host has no review to submit.")).toMatchObject({
      isAvailable: false,
      unavailableReason: "A branch without a code host has no review to submit.",
      buttonLabel: "Submit review",
      pendingComments: [],
      verdicts: [],
    })
  })
})
