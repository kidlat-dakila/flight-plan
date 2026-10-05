import { describe, expect, it } from "vitest"
import {
  groupThreads,
  issueStateFilter,
  pageOfSlice,
  toChangedFile,
  toRepository,
  toThread,
} from "@/utils/git-adapter/custom-providers/bitbucket-mappers"
import type { RawComment } from "@/utils/git-adapter/custom-providers/bitbucket-raw"

const comment = (id: number, extra: Partial<RawComment> = {}): RawComment => ({ id, ...extra })

describe("groupThreads", () => {
  it("puts a reply to a reply under the comment that started the thread", () => {
    const threads = groupThreads([
      comment(1),
      comment(2, { parent: { id: 1 } }),
      comment(3, { parent: { id: 2 } }),
    ])

    expect(threads).toHaveLength(1)
    expect(threads[0]?.replies.map((reply) => reply.id)).toStrictEqual([2, 3])
  })

  it("keeps replies in the order they were written", () => {
    const threads = groupThreads([comment(1), comment(5, { parent: { id: 1 } }), comment(2, { parent: { id: 1 } })])

    expect(threads[0]?.replies.map((reply) => reply.id)).toStrictEqual([2, 5])
  })

  it("drops deleted comments and the replies of a deleted thread", () => {
    const threads = groupThreads([
      comment(1, { deleted: true }),
      comment(2, { parent: { id: 1 } }),
      comment(3),
      comment(4, { parent: { id: 3 }, deleted: true }),
    ])

    expect(threads.map((thread) => thread.root.id)).toStrictEqual([3])
    expect(threads[0]?.replies).toStrictEqual([])
  })
})

describe("toThread", () => {
  it("anchors the thread to the line range of its first comment", () => {
    const thread = toThread({
      root: comment(1, { inline: { path: "a.ts", from: null, to: 20, start_to: 18 } }),
      replies: [],
    })

    expect(thread).toMatchObject({ path: "a.ts", line: 20, startLine: 18, isResolved: false, isOutdated: false })
  })

  it("marks a thread resolved only when the first comment has a resolution", () => {
    const resolved = toThread({ root: comment(1, { resolution: {} }), replies: [] })
    const reopened = toThread({ root: comment(1, { resolution: null }), replies: [] })

    expect(resolved.isResolved).toBe(true)
    expect(reopened.isResolved).toBe(false)
  })
})

describe("issueStateFilter", () => {
  it("filters to the open states by default and to the closed states on request", () => {
    expect(issueStateFilter(undefined)).toBe(
      "state=\"new\" OR state=\"open\" OR state=\"submitted\" OR state=\"on hold\"",
    )
    expect(issueStateFilter("closed")).toBe(
      "state=\"resolved\" OR state=\"invalid\" OR state=\"duplicate\" OR state=\"wontfix\" OR state=\"closed\"",
    )
  })

  it("applies no filter for every state", () => {
    expect(issueStateFilter("all")).toBeNull()
  })
})

describe("toChangedFile", () => {
  it("falls back to the old path for a removed file and to unknown for an unfamiliar status", () => {
    expect(toChangedFile({ status: "removed", old: { path: "gone.ts" }, new: null })).toMatchObject({
      path: "gone.ts",
      status: "removed",
    })
    expect(toChangedFile({ status: "moved", new: { path: "x.ts" } })).toMatchObject({ status: "unknown" })
  })
})

describe("toRepository", () => {
  it("takes the owner from the workspace, or from the full name when the workspace is absent", () => {
    expect(toRepository({ full_name: "acme/shop", workspace: { slug: "team" } }).owner.login).toBe("team")
    expect(toRepository({ full_name: "acme/shop" }).owner.login).toBe("acme")
  })
})

describe("pageOfSlice", () => {
  it("returns the requested page and says whether another follows", () => {
    const first = pageOfSlice([1, 2, 3, 4, 5], 1, 2)
    const last = pageOfSlice([1, 2, 3, 4, 5], 3, 2)

    expect(first).toStrictEqual({ items: [1, 2], totalCount: 5, hasNextPage: true, nextPage: 2 })
    expect(last).toStrictEqual({ items: [5], totalCount: 5, hasNextPage: false })
  })
})
