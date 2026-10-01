import { appendComment } from "@/procedures/add-comment/utils/append-comment"
import { EMPTY_DISCUSSION, type Discussion } from "@/procedures/get-review/utils/discussion"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const discussion: Discussion = {
  reviews: [],
  threads: [
    {
      id: "thread-1",
      path: "src/price.ts",
      line: 4,
      comments: [{ id: "comment-1", author: "amara", body: "Why?", createdAt: NOW, isPending: false }],
    },
  ],
}

describe("appendComment", () => {
  it("starts a thread on a line with a pending comment from the reviewer", () => {
    const appended = appendComment(EMPTY_DISCUSSION, { threadId: null, location: { path: "src/price.ts", line: 9 }, body: "Check this." }, NOW)

    expect(appended).toStrictEqual({
      threadId: "thread-1",
      discussion: {
        reviews: [],
        threads: [
          {
            id: "thread-1",
            path: "src/price.ts",
            line: 9,
            comments: [{ id: "comment-1", author: "you", body: "Check this.", createdAt: NOW, isPending: true }],
          },
        ],
      },
    })
  })

  it("starts a thread on the pull request as a whole when no line is given", () => {
    const appended = appendComment(discussion, { threadId: null, location: null, body: "Overall fine." }, NOW)

    expect(appended?.discussion.threads[1]).toMatchObject({ id: "thread-2", path: null, line: null })
  })

  it("adds a reply to the end of its thread", () => {
    const appended = appendComment(discussion, { threadId: "thread-1", location: null, body: "Because." }, NOW)

    expect(appended?.threadId).toBe("thread-1")
    expect(appended?.discussion.threads[0].comments.map((comment) => comment.id)).toStrictEqual(["comment-1", "comment-2"])
  })

  it("reports nothing for a thread that is not there", () => {
    expect(appendComment(discussion, { threadId: "thread-9", location: null, body: "Lost." }, NOW)).toBeNull()
  })
})
