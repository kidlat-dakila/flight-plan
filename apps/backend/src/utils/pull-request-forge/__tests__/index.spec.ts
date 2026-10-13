import { adapterWith } from "@/__tests__/adapter-stub"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { createPullRequestForge } from "@/utils/pull-request-forge"
import type { OpenedRepository } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type Capability, type GitAdapter, type PullRequestDiscussion } from "@flightplan/git-forge"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const SECOND_MS = 1000

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  hasFollowedAuthors: true,
  targets: [],
}

const ada = { login: "ada", name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" }
const grace = { login: "grace", avatarUrl: "" }

const discussion: PullRequestDiscussion = {
  comments: [{ id: "c1", author: grace, body: "Later.", createdAt: "2026-10-01T10:00:00Z", url: "" }],
  threads: [
    {
      id: "t1",
      path: "src/price.ts",
      position: { path: "src/price.ts", side: "old", startLine: 4, endLine: 6 },
      isResolved: true,
      isOutdated: false,
      comments: [{ id: "c2", author: ada, body: "Why?", createdAt: "2026-10-01T11:00:00Z", url: "" }],
    },
  ],
  reviews: [{ id: "r1", author: ada, verdict: "approve", body: "Good.", submittedAt: "2026-10-01T11:30:00Z", url: "" }],
}

const allCapabilities = new Set<Capability>(["discussion", "review", "replies", "resolution", "reviewRequests"])

const readingAdapter = (parts: Partial<GitAdapter> = {}): GitAdapter =>
  adapterWith("gh", {
    name: "the GitHub CLI",
    supports: (capability) => allCapabilities.has(capability),
    reviewVerdicts: () => ["comment", "approve"],
    reviewers: async () => await Promise.resolve({ author: grace, reviewers: [{ ...ada, state: "approved" }, { ...grace, state: "pending" }] }),
    discussion: async () => await Promise.resolve(discussion),
    viewer: async () => await Promise.resolve(ada),
    ...parts,
  })

const opening = (adapter: GitAdapter): OpenedRepository => ({
  forge: "gh",
  adapterName: "gh",
  forgeSlug: "acme/storefront",
  resolved: { ok: true, gitAdapter: adapter, repo: "acme/storefront" },
})

const resolveNothing = async (): Promise<void> => {
  await Promise.resolve()
}

const createForge = (opened: OpenedRepository) => {
  const now = vi.fn<() => Date>(() => NOW)
  const openRepository = vi.fn(async () => await Promise.resolve(opened))
  const forge = createPullRequestForge({ openRepository, readForges: async () => await Promise.resolve(null), now })
  return {
    forge,
    openRepository,
    setNow: (date: Date) => {
      now.mockReturnValue(date)
    },
  }
}

describe("createPullRequestForge", () => {
  it("reads the pull request's address, reviewers, discussion, viewer and what the adapter can do", async () => {
    const { forge } = createForge(opening(readingAdapter()))

    await expect(forge.read(repository, 7)).resolves.toStrictEqual({
      kind: "read",
      pullRequest: {
        url: "https://github.com/acme/storefront/pull/7",
        reviewers: [
          { login: "ada", name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png", state: "approved" },
          { login: "grace", name: "grace", avatarUrl: null, state: "pending" },
        ],
        discussion: {
          comments: [{ id: "c1", author: { name: "grace", avatarUrl: null }, body: "Later.", createdAt: new Date("2026-10-01T10:00:00Z") }],
          threads: [
            {
              id: "t1",
              path: "src/price.ts",
              position: { path: "src/price.ts", side: "old", startLine: 4, endLine: 6 },
              isResolved: true,
              isOutdated: false,
              comments: [
                { id: "c2", author: { name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" }, body: "Why?", createdAt: new Date("2026-10-01T11:00:00Z") },
              ],
            },
          ],
          reviews: [
            {
              id: "r1",
              author: { name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" },
              verdict: "approve",
              body: "Good.",
              createdAt: new Date("2026-10-01T11:30:00Z"),
            },
          ],
        },
        viewer: { name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" },
        abilities: { verdicts: ["comment", "approve"], canReply: true, canResolve: true, canRequestReviewers: true, canRequestAgain: false },
      },
    })
  })

  it("reads the code host once within a minute, and again after a write", async () => {
    const readDiscussion = vi.fn(async () => await Promise.resolve(discussion))
    const { forge, setNow } = createForge(opening(readingAdapter({ discussion: readDiscussion, addComment: resolveNothing })))

    await forge.read(repository, 7)
    await forge.read(repository, 7)
    expect(readDiscussion).toHaveBeenCalledTimes(1)

    await forge.addComment(repository, 7, "Thanks.")
    await forge.read(repository, 7)
    expect(readDiscussion).toHaveBeenCalledTimes(2)

    setNow(new Date(NOW.getTime() + 61 * SECOND_MS))
    await forge.read(repository, 7)
    expect(readDiscussion).toHaveBeenCalledTimes(3)
  })

  it("is unavailable with the reason when the adapter cannot be opened, holds no discussion, or fails", async () => {
    const closed: OpenedRepository = {
      ...opening(readingAdapter()),
      resolved: { ok: false, error: new GitAdapterError("The GitHub CLI is not installed here.", "no-cli"), repo: "" },
    }
    const failing = readingAdapter({ discussion: async () => await Promise.reject(new GitAdapterError("Bad credentials", "auth")) })

    await expect(createForge(closed).forge.read(repository, 7)).resolves.toStrictEqual({
      kind: "unavailable",
      reason: "The GitHub CLI is not installed here.",
    })
    await expect(createForge(opening(readingAdapter({ supports: () => false }))).forge.read(repository, 7)).resolves.toStrictEqual({
      kind: "unavailable",
      reason: "the GitHub CLI has no pull request discussion.",
    })
    await expect(createForge(opening(failing)).forge.read(repository, 7)).resolves.toStrictEqual({ kind: "unavailable", reason: "Bad credentials" })
  })

  it("submits a review to the adapter with the commit it was written against", async () => {
    const submitReview = vi.fn<GitAdapter["submitReview"]>(resolveNothing)
    const { forge } = createForge(opening(readingAdapter({ submitReview })))
    const comments = [{ position: { path: "src/price.ts", side: "new" as const, startLine: 4, endLine: 6 }, body: "Why?" }]

    await expect(forge.submitReview(repository, 7, { verdict: "approve", body: "Good.", comments, commit: "abc1234" })).resolves.toStrictEqual({
      kind: "done",
    })
    expect(submitReview).toHaveBeenCalledWith({ kind: "pr", number: 7 }, { verdict: "approve", body: "Good.", comments, commitSha: "abc1234" })
  })

  it("passes each write on to the adapter", async () => {
    const replyToThread = vi.fn<GitAdapter["replyToThread"]>(resolveNothing)
    const resolveThread = vi.fn<GitAdapter["resolveThread"]>(resolveNothing)
    const reopenThread = vi.fn<GitAdapter["reopenThread"]>(resolveNothing)
    const requestReviewers = vi.fn<GitAdapter["requestReviewers"]>(resolveNothing)
    const removeReviewRequests = vi.fn<GitAdapter["removeReviewRequests"]>(resolveNothing)
    const { forge } = createForge(
      opening(readingAdapter({ replyToThread, resolveThread, reopenThread, requestReviewers, removeReviewRequests })),
    )
    const ref = { kind: "pr", number: 7 }

    await forge.reply(repository, 7, "t1", "Agreed.")
    await forge.setResolved(repository, 7, "t1", true)
    await forge.setResolved(repository, 7, "t1", false)
    await forge.requestReviewer(repository, 7, "grace")
    await forge.removeReviewRequest(repository, 7, "grace")

    expect(replyToThread.mock.calls).toStrictEqual([[ref, "t1", "Agreed."]])
    expect(resolveThread.mock.calls).toStrictEqual([[ref, "t1"]])
    expect(reopenThread.mock.calls).toStrictEqual([[ref, "t1"]])
    expect(requestReviewers.mock.calls).toStrictEqual([[ref, ["grace"]]])
    expect(removeReviewRequests.mock.calls).toStrictEqual([[ref, ["grace"]]])
  })

  it("passes on the code host's reason when it refuses a write", async () => {
    const refusing = readingAdapter({
      submitReview: async () => { await Promise.reject(new GitAdapterError("Can not approve your own pull request")) },
    })

    await expect(
      createForge(opening(refusing)).forge.submitReview(repository, 7, { verdict: "approve", body: "", comments: [], commit: "abc1234" }),
    ).resolves.toStrictEqual({ kind: "refused", reason: "Can not approve your own pull request" })
  })

  it("lists the people the adapter finds, and nobody when it fails", async () => {
    const searching = readingAdapter({ searchReviewers: async () => await Promise.resolve([ada, grace]) })
    const failing = readingAdapter({ searchReviewers: async () => await Promise.reject(new Error("offline")) })

    await expect(createForge(opening(searching)).forge.searchReviewers(repository, 7, "a")).resolves.toStrictEqual([
      { login: "ada", name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" },
      { login: "grace", name: "grace", avatarUrl: null },
    ])
    await expect(createForge(opening(failing)).forge.searchReviewers(repository, 7, "a")).resolves.toStrictEqual([])
  })
})
