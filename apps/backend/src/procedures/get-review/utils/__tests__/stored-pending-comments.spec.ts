import { formatStoredPendingComments, parseStoredPendingComments } from "@/procedures/get-review/utils/stored-pending-comments"

const pendingComments = [
  {
    id: "c1",
    position: { path: "src/price.ts", side: "new" as const, startLine: 4, endLine: 6 },
    body: "Why?",
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    commit: "abc1234",
  },
]

describe("stored pending comments", () => {
  it("reads back what it wrote", () => {
    expect(parseStoredPendingComments(formatStoredPendingComments(pendingComments))).toStrictEqual(pendingComments)
  })

  it("reads nothing from text it cannot read", () => {
    expect(parseStoredPendingComments("not json")).toStrictEqual([])
    expect(parseStoredPendingComments("[{\"id\":\"c1\"}]")).toStrictEqual([])
  })
})
