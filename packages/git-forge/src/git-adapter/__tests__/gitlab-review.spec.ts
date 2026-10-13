import { afterEach, describe, expect, it, vi } from "vitest"
import { GitlabAdapter, gitlabDiffAnchor } from "@/git-adapter/gitlab-adapter"
import { refusal, stubForge, type ForgeCall, type StubbedForge } from "./stubbed-forge"

const REF = { kind: "pr", number: 5 } as const
const PROJECT = "https://gitlab.com/api/v4/projects/group%2Fproject"
const MERGE_REQUEST_ROUTE = `${PROJECT}/merge_requests/5`
const WEB_URL = "https://gitlab.com/group/project/-/merge_requests/5"
const PATH = "src/price.ts"

afterEach(() => {
  vi.unstubAllGlobals()
})

const user = (id: number, username: string) => ({ id, username, name: username.toUpperCase(), avatar_url: `/uploads/${username}.png` })

const MERGE_REQUEST = {
  iid: 5,
  title: "Count held units",
  web_url: WEB_URL,
  updated_at: "2026-10-01T09:00:00Z",
  state: "opened",
  author: user(1, "mira"),
  reviewers: [user(2, "teo")],
  diff_refs: { base_sha: "base000", start_sha: "start00", head_sha: "head000" },
}

const DIFF = [
  "diff --git a/src/price.ts b/src/price.ts",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  "@@ -3,3 +3,4 @@",
  " three",
  "-four",
  "+four again",
  "+four and a half",
  " five",
].join("\n")

const note = (id: number, username: string, body: string, extra: object = {}) => ({
  id,
  body,
  author: user(id, username),
  created_at: "2026-10-01T10:00:00Z",
  system: false,
  ...extra,
})

const DISCUSSIONS = [
  { id: "d-general", notes: [note(1, "teo", "Later.")] },
  { id: "d-approval", notes: [note(2, "jonas", "approved this merge request", { system: true })] },
  { id: "d-system", notes: [note(3, "mira", "added 1 commit", { system: true })] },
  {
    id: "d-removed",
    notes: [
      note(4, "amara", "Why drop it?", { resolved: true, position: { old_path: PATH, new_path: PATH, old_line: 4, new_line: null } }),
      note(5, "mira", "It moved."),
    ],
  },
  {
    id: "d-range",
    notes: [
      note(6, "jonas", "Clamp these.", {
        resolved: false,
        position: { old_path: PATH, new_path: PATH, old_line: null, new_line: 5, line_range: { start: { new_line: 4 }, end: { new_line: 5 } } },
      }),
    ],
  },
]

const answer = (call: ForgeCall): unknown => {
  if (call.method !== "GET") return {}
  if (call.url.includes("/discussions")) return DISCUSSIONS
  if (call.url.includes("/raw_diffs")) return DIFF
  if (call.url.includes("/users?")) return call.url.includes("username=lena") ? [user(9, "lena")] : []
  if (call.url.includes("/members/all")) return [user(9, "lena")]
  return MERGE_REQUEST
}

const adapterOn = (respond: (call: ForgeCall) => unknown = answer): { adapter: GitlabAdapter, forge: StubbedForge } => {
  const forge = stubForge(respond)
  vi.stubGlobal("fetch", forge.fetcher)
  return { adapter: new GitlabAdapter({ token: "t", repo: "group/project" }), forge }
}

describe("GitlabAdapter discussion", () => {
  it("reads the notes on the merge request, the threads on the diff and the approvals", async () => {
    const { adapter } = adapterOn()

    await expect(adapter.discussion(REF)).resolves.toMatchObject({
      comments: [{ id: "1", author: { login: "teo", avatarUrl: "https://gitlab.com/uploads/teo.png" }, body: "Later.", url: `${WEB_URL}#note_1` }],
      threads: [
        {
          id: "d-removed",
          path: PATH,
          position: { path: PATH, side: "old", startLine: 4, endLine: 4 },
          isResolved: true,
          comments: [{ id: "4" }, { id: "5" }],
        },
        { id: "d-range", position: { path: PATH, side: "new", startLine: 4, endLine: 5 }, isResolved: false },
      ],
      reviews: [{ id: "2", author: { login: "jonas" }, verdict: "approve", body: "" }],
    })
  })

  it("offers every verdict, and that a reviewer can be asked again", () => {
    const { adapter } = adapterOn()

    expect(adapter.reviewVerdicts()).toStrictEqual(["comment", "approve", "request-changes"])
    expect(adapter.supports("repeatedReviewRequests")).toBe(true)
  })
})

describe("GitlabAdapter review", () => {
  it("posts each line comment at its place in the diff, then the summary, then the approval", async () => {
    const { adapter, forge } = adapterOn()
    const anchor = gitlabDiffAnchor(PATH)

    await adapter.submitReview(REF, {
      verdict: "approve",
      body: "Good.",
      commitSha: "head000",
      comments: [
        { position: { path: PATH, side: "old", startLine: 4, endLine: 4 }, body: "Why drop it?" },
        { position: { path: PATH, side: "new", startLine: 4, endLine: 6 }, body: "Clamp these." },
      ],
    })

    const refs = { base_sha: "base000", start_sha: "start00", head_sha: "head000" }
    expect(forge.writes()).toStrictEqual([
      {
        method: "POST",
        url: `${MERGE_REQUEST_ROUTE}/discussions`,
        body: { body: "Why drop it?", position: { position_type: "text", ...refs, old_path: PATH, new_path: PATH, old_line: 4 } },
      },
      {
        method: "POST",
        url: `${MERGE_REQUEST_ROUTE}/discussions`,
        body: {
          body: "Clamp these.",
          position: {
            position_type: "text",
            ...refs,
            old_path: PATH,
            new_path: PATH,
            old_line: 5,
            new_line: 6,
            line_range: {
              start: { line_code: `${anchor}_5_4`, type: "new", new_line: 4 },
              end: { line_code: `${anchor}_5_6`, type: "new", old_line: 5, new_line: 6 },
            },
          },
        },
      },
      { method: "POST", url: `${MERGE_REQUEST_ROUTE}/notes`, body: { body: "Good." } },
      { method: "POST", url: `${MERGE_REQUEST_ROUTE}/approve`, body: {} },
    ])
  })

  it("requests changes through the GraphQL address of the same host, after the summary", async () => {
    const { adapter, forge } = adapterOn((call) =>
      (call.url.endsWith("/api/graphql") ? { data: { mergeRequestRequestChanges: { errors: [] } } } : answer(call)))

    await adapter.submitReview(REF, { verdict: "request-changes", body: "No.", commitSha: "head000", comments: [] })

    expect(forge.writes().map((call) => [call.method, call.url])).toStrictEqual([
      ["POST", `${MERGE_REQUEST_ROUTE}/notes`],
      ["POST", "https://gitlab.com/api/graphql"],
    ])
    expect(JSON.stringify(forge.writes().at(1)?.body)).toContain(
      "mergeRequestRequestChanges(input: { projectPath: \\\"group/project\\\", iid: \\\"5\\\" })",
    )
  })

  it("passes on GitLab's reason when it does not take the request for changes", async () => {
    const review = { verdict: "request-changes" as const, body: "", commitSha: "head000", comments: [] }
    const refusing = adapterOn((call) =>
      (call.url.endsWith("/api/graphql")
        ? { data: { mergeRequestRequestChanges: { errors: ["You cannot request changes on your own merge request"] } } }
        : answer(call)))

    await expect(refusing.adapter.submitReview(REF, review)).rejects.toMatchObject({
      message: "You cannot request changes on your own merge request",
    })
  })

  it("passes on GitLab's reason when it does not know the request for changes", async () => {
    const review = { verdict: "request-changes" as const, body: "", commitSha: "head000", comments: [] }
    const unknowing = adapterOn((call) =>
      (call.url.endsWith("/api/graphql") ? { errors: [{ message: "Field 'mergeRequestRequestChanges' doesn't exist" }] } : answer(call)))

    await expect(unknowing.adapter.submitReview(REF, review)).rejects.toMatchObject({
      message: "Field 'mergeRequestRequestChanges' doesn't exist",
    })
  })

  it("sends nothing when a comment is on a line the diff does not hold", async () => {
    const { adapter, forge } = adapterOn()

    await expect(
      adapter.submitReview(REF, {
        verdict: "comment",
        body: "",
        commitSha: "head000",
        comments: [
          { position: { path: PATH, side: "new", startLine: 4, endLine: 4 }, body: "Fine." },
          { position: { path: PATH, side: "new", startLine: 40, endLine: 40 }, body: "Not in the diff." },
        ],
      }),
    ).rejects.toMatchObject({ problem: "unsupported" })
    expect(forge.writes()).toStrictEqual([])
  })

  it("comments, replies to a thread, resolves it and reopens it", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.addComment(REF, "Thanks.")
    await adapter.replyToThread(REF, "d-range", "Done.")
    await adapter.resolveThread(REF, "d-range")
    await adapter.reopenThread(REF, "d-range")

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: `${MERGE_REQUEST_ROUTE}/notes`, body: { body: "Thanks." } },
      { method: "POST", url: `${MERGE_REQUEST_ROUTE}/discussions/d-range/notes`, body: { body: "Done." } },
      { method: "PUT", url: `${MERGE_REQUEST_ROUTE}/discussions/d-range`, body: { resolved: true } },
      { method: "PUT", url: `${MERGE_REQUEST_ROUTE}/discussions/d-range`, body: { resolved: false } },
    ])
  })

  it("adds a reviewer to the ones already asked, and removes one", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.requestReviewers(REF, ["@lena"])
    await adapter.removeReviewRequests(REF, ["TEO"])

    expect(forge.writes()).toStrictEqual([
      { method: "PUT", url: MERGE_REQUEST_ROUTE, body: { reviewer_ids: [2, 9] } },
      { method: "PUT", url: MERGE_REQUEST_ROUTE, body: { reviewer_ids: [] } },
    ])
  })

  it("asks a person who is a reviewer already for another review, without touching the list of reviewers", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.requestReviewers(REF, ["Teo", "lena"])

    expect(forge.writes()).toStrictEqual([
      { method: "PUT", url: MERGE_REQUEST_ROUTE, body: { reviewer_ids: [2, 9] } },
      { method: "POST", url: `${MERGE_REQUEST_ROUTE}/notes`, body: { body: "/request_review @teo" } },
    ])
  })

  it("says so when it knows no user by that name", async () => {
    const { adapter, forge } = adapterOn()

    await expect(adapter.requestReviewers(REF, ["nobody"])).rejects.toMatchObject({ message: "GitLab has no user named nobody." })
    expect(forge.writes()).toStrictEqual([])
  })

  it("lists the project members who can be asked, and passes on a refusal's reason", async () => {
    await expect(adapterOn().adapter.searchReviewers(REF, "le")).resolves.toMatchObject([{ login: "lena", name: "LENA" }])

    const refusing = adapterOn((call) => (call.method === "GET" ? answer(call) : refusal(403, { message: "403 Forbidden" })))

    await expect(refusing.adapter.addComment(REF, "Thanks.")).rejects.toMatchObject({ message: "403 Forbidden", problem: "auth" })
  })
})
