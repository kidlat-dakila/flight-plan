import { withInlineAvatars } from "./avatars"
import type { Fetcher, GitAdapter, Person, Reviewer, ReviewTarget, ReviewSummary } from "../git-adapter/types"

/**
 * What the panel's review bar is told to draw.
 *
 * The one declaration: the renderer's `ReviewHeader` imports this type. Built
 * from the adapter's `Person` and `Reviewer`, with every `avatarUrl` already a
 * `data:` URI or empty by the time the panel sees it (`withInlineAvatars`).
 *
 * Two shapes rather than one with optional halves, because the difference is
 * not that some fields are missing. It is whether this reader has a code host
 * at all — and plain git does not know that reviewing is a thing that happens,
 * so a header pretending otherwise with four empty slots would be a worse
 * answer than one that says so.
 */
export type ReviewHeaderData =
  | {
      kind: "review"
      title: string
      author: Person
      reviewers: Reviewer[]
      /** Where it lives on the host. Empty hides the button. */
      url: string
      /** `#1234`, or the branch name. What the button and label say. */
      label: string
      isDraft?: boolean
    }
  | {
      kind: "bare"
      /** The branch, which is all plain git can offer. */
      branch: string
      /** The adapter in use, for prose: "git". */
      gitAdapterName: string
    }

function labelFor(target: ReviewTarget): string {
  return target.ref.kind === "pr" ? `#${String(target.ref.number)}` : target.ref.name
}

/**
 * The header for a change, or the honest fallback when the adapter has no idea.
 *
 * Never throws and never rejects. The header is a bar above the thing the
 * reader came for, so every failure below degrades to a less informative header
 * rather than to no walkthrough: a adapter that cannot answer, a host that is
 * down, a token without the scope. Each of those costs the faces and keeps the
 * title and the link.
 *
 * The avatar fetch is part of this rather than left to the panel, because the
 * panel cannot do it: its CSP forbids loading a remote image, deliberately. See
 * `src/api/pr/avatars.ts`.
 */
export async function buildReviewHeader(
  target: ReviewTarget,
  gitAdapter: GitAdapter,
  options: { fetcher?: Fetcher } = {},
): Promise<ReviewHeaderData> {
  /*
   * The capability decides, not a failed call.
   *
   * `reviewers` throws `unsupported` on a adapter that does not have it, and
   * catching that would work — but it would also swallow a real failure on a
   * adapter that does, and report "your host cannot do this" for what was
   * actually an expired token. Asking first keeps the two apart.
   */
  if (!gitAdapter.supports("reviewers")) {
    return {
      kind: "bare",
      branch: target.ref.kind === "branch" ? target.ref.name : target.title,
      gitAdapterName: gitAdapter.name,
    }
  }

  let summary: ReviewSummary
  try {
    summary = await withInlineAvatars(await gitAdapter.reviewers(target.ref), options)
  } catch {
    /*
     * The host had the answer and would not give it.
     *
     * Not the `bare` header: that one says "your adapter cannot do this and here
     * is how to fix it", which would be a lie about a adapter that can. A review
     * header with the author it already knows and no faces is the truthful
     * version of "this did not load".
     */
    return {
      kind: "review",
      title: target.title,
      author: { login: target.author, avatarUrl: "" },
      reviewers: [],
      url: target.url,
      label: labelFor(target),
      isDraft: target.isDraft,
    }
  }

  return {
    kind: "review",
    title: target.title,
    author: summary.author,
    reviewers: summary.reviewers,
    url: target.url,
    label: labelFor(target),
    isDraft: target.isDraft,
  }
}
