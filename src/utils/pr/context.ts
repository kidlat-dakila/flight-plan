import { walkthroughPrompts, planPrompts, generationPrompt, type Prompts } from "../clipboard"
import { sameCommit, type GitAdapter, type ReviewTarget, type TargetRef } from "../../lib/git-adapter/types"
import type { StoredDocument } from "../../lib/schemas/document/stored"
import { buildReviewHeader, type ReviewHeaderData } from "../../lib/review/reviewHeader"
import { label, reviewContext } from "./review"
import { citationsOf, noticeFor, staleness, type Notice } from "../../lib/review/staleness"

/**
 * Everything a panel shows around a document, that is not the document.
 *
 * The review header, the staleness notice, the coverage bar, the links into
 * the change, which files the editor may open, and the prompts the copy
 * buttons hand out. The extension used to assemble this into its `load`
 * message; the HTTP API now serves it beside the document
 * (`GET /api/context/{id}`), so the browser and the webview read the same
 * thing.
 */

export type Coverage = { covered: number; total: number; uncovered: string[] }

export type PanelContext = {
  header: ReviewHeaderData | null
  notice: Notice | null
  /** A diff anchor or link per cited file, and the change's own address. */
  links: { prUrl: string; anchors: Record<string, string> } | null
  coverage: Coverage | null
  /** Cited files on disk at the document's commit and unmodified. */
  openable: string[] | null
  /** Repository and commit, for qualifying references the reader cannot resolve. */
  at: { repo: string; sha: string } | null
  prompts: Prompts | null
  /** What the panel says while the document is still being read. */
  waiting: string | null
}

export const EMPTY_CONTEXT: PanelContext = {
  header: null,
  notice: null,
  links: null,
  coverage: null,
  openable: null,
  at: null,
  prompts: null,
  waiting: null,
}

/**
 * The notice above a walkthrough, or null when there is nothing to say.
 *
 * Two cases. A adapter that cannot compare two commits cannot check staleness,
 * and the reader needs to know that before they trust the line numbers. A
 * adapter that can, and a change that moved past the commit the walkthrough was
 * written at, gets the staleness tier's notice. Not being able to check is
 * not the same as being stale, so a failed comparison says nothing.
 */
export async function walkthroughNotice(
  gitAdapter: GitAdapter,
  document: StoredDocument,
  ref: TargetRef,
  headNow: string | null,
  prompt: string,
): Promise<Notice | null> {
  if (!gitAdapter.supports("compare")) {
    return {
      level: "info",
      text:
        `Read with ${gitAdapter.name}, so nothing here has been checked against the ` +
        `change as it stands: no diff marks, no coverage, and no way to tell ` +
        `whether the lines it points at have moved. Set up a way to reach your ` +
        `code host, or fetch the branch to read it from the checkout.`,
      prompt,
      actions: ["setup", "fetch"],
      branch: ref.kind === "branch" ? ref.name : null,
    }
  }
  const writtenAt = document.meta.kind === "walkthrough" ? document.meta.head : null
  if (writtenAt === null || headNow === null || sameCommit(writtenAt, headNow)) return null
  try {
    return noticeFor(await staleness(gitAdapter, citationsOf(document), writtenAt, headNow), prompt)
  } catch {
    return null
  }
}

/** The "no walkthrough yet" screen's data. */
export type MissingData = {
  /** One reason: no walkthrough is stored for this change on this machine. */
  reason: "absent"
  repo: string
  number: number
  /** Set when the change is a branch rather than a pull request. */
  branch?: string | null
  title: string
  author: string
  url: string
  /** What to paste into an assistant to have one written. */
  prompt?: string
}

export function missingData(repo: string, ref: TargetRef, target: ReviewTarget | null): MissingData {
  return {
    reason: "absent",
    repo,
    number: ref.kind === "pr" ? ref.number : 0,
    branch: ref.kind === "branch" ? ref.name : null,
    title: target?.title ?? label(repo, ref),
    author: target?.author ?? "",
    url: target?.url ?? "",
    prompt: generationPrompt(repo, ref),
  }
}

/**
 * A walkthrough's context, from the adapter for its checkout.
 *
 * `adapter` and `root` are null when no checkout of the repository is recorded:
 * the document still renders, with prompts and nothing that needs the host.
 * `document` is null when none is stored; the header is still worth showing
 * above the "no walkthrough yet" screen.
 */
export async function walkthroughContext(input: {
  repo: string
  ref: TargetRef
  document: StoredDocument | null
  root: string | null
  gitAdapter: GitAdapter | null
}): Promise<PanelContext> {
  const { repo, ref, document, root, gitAdapter } = input
  const prompts = walkthroughPrompts(repo, ref)
  const waiting = `Reading ${label(repo, ref)}…`
  if (gitAdapter === null || root === null) return { ...EMPTY_CONTEXT, prompts, waiting }

  const [target, headNow] = await Promise.all([
    gitAdapter.target(ref).catch(() => null),
    gitAdapter.headSha(ref).catch(() => null),
  ])
  // `buildReviewHeader` never rejects; its failures are headers that say less.
  const header = target === null ? null : await buildReviewHeader(target, gitAdapter)
  if (document === null) return { ...EMPTY_CONTEXT, header, prompts, waiting }

  const writtenAt = document.meta.kind === "walkthrough" ? document.meta.head : null
  // Falls back to the current head only for a document that names none.
  const at = writtenAt ?? headNow
  const [notice, review] = await Promise.all([
    walkthroughNotice(gitAdapter, document, ref, headNow, prompts.update),
    reviewContext(gitAdapter, root, repo, ref, target?.url ?? "", document, at).catch(() => null),
  ])
  return {
    header,
    notice,
    links: review?.links ?? null,
    coverage: review?.coverage ?? null,
    openable: review?.openable ?? null,
    at: review?.at ?? (at === null ? null : { repo, sha: at }),
    prompts,
    waiting,
  }
}

/**
 * A plan's context: its prompts, and nothing from a adapter.
 *
 * A plan is read from the working tree on the current branch, so there is no
 * commit to qualify references with and no change to cover.
 */
export function planContext(repo: string, name: string): PanelContext {
  return { ...EMPTY_CONTEXT, prompts: planPrompts(repo, name), waiting: `Reading ${name}…` }
}
