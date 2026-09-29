import type { TargetRef, GitAdapter } from "../../lib/git-adapter/types"
import type { WalkthroughKey } from "../../api/mcp/storage"
import { diagramPaths, type StoredDocument } from "../../lib/schemas/document/stored"
import { changedPaths } from "./patch"
import type { Coverage } from "./context"
import { locallyOpenable } from "./source"
import { citationsOf } from "../../lib/review/staleness"

/** A ref as the storage layer keys a walkthrough. */
export function storageKey(ref: TargetRef): WalkthroughKey {
  return ref.kind === "pr"
    ? { kind: "pr", number: ref.number }
    : { kind: "branch", name: ref.name }
}

/** How a change is named in a title and a prompt. */
export function label(repo: string, ref: TargetRef): string {
  return ref.kind === "pr"
    ? `${repo}#${String(ref.number)}`
    : `${repo} on ${ref.name}`
}

/**
 * Everything the panel needs about the pull request behind a walkthrough.
 *
 * Extracted because the panel can be opened two ways and only one of them was
 * building this. An assistant that writes a walkthrough and has
 * `start` open it got the document and nothing else: no diff marks, so
 * there was no way to tell which lines the change added; no permalinks; no
 * coverage. The document was right and the panel was half-furnished, which
 * reads as the walkthrough being unhelpful rather than as a missing fetch.
 *
 * Every part is optional and independently recoverable. A walkthrough reads
 * without any of it, so a failed host call costs the marks and the count, not
 * the walkthrough — and a adapter that cannot answer at all simply contributes
 * none of them.
 */
export async function reviewContext(
  gitAdapter: GitAdapter,
  cwd: string,
  repo: string,
  ref: TargetRef,
  prUrl: string,
  document: StoredDocument,
  /** The commit the walkthrough is read at, when it is known. */
  at: string | null,
): Promise<{
  links: { prUrl: string; anchors: Record<string, string> }
  coverage: Coverage | null
  openable: string[]
  at: { repo: string; sha: string } | null
}> {
  const citations = citationsOf(document)
  /*
   * Anchors are the host's, not GitHub's.
   *
   * Each keys a file in a diff differently — GitHub on the SHA-256 of the path,
   * GitLab on the SHA-1, Bitbucket on the path itself — so a fixed hash sends
   * every non-GitHub reader to the top of the diff. A adapter with no web
   * interface contributes none, and the panel then opens the file in the editor
   * instead, which is the better answer anyway.
   */
  const anchors: Record<string, string> = {}
  if (gitAdapter.supports("permalink")) {
    for (const citation of citations) {
      try {
        anchors[citation.path] = gitAdapter.permalink(ref, citation.path)
      } catch {
        // One unlinkable path costs its own link and nothing else.
      }
    }
  }

  /*
   * The files the change touches, for the coverage count.
   *
   * Only coverage. What the change did to each file is in the document's own
   * `sources`, resolved when it was written, and the panel reads that.
   */
  let coverage: Coverage | null = null
  try {
    const changed = changedPaths(await gitAdapter.diff(ref))
    const cited = new Set(citations.map((citation) => citation.path))
    const uncovered = changed.filter((path) => !cited.has(path))
    coverage = {
      covered: changed.length - uncovered.length,
      total: changed.length,
      uncovered,
    }
  } catch {
    // An addition to a walkthrough that reads fine without it.
  }

  /*
   * Which files the reader can be sent to in their own editor, decided once.
   *
   * The diagram's own paths are in here as well as the waypoints'. Leaving them
   * out is what sent a click on a context card to github.com: `openable` was
   * built from the citations alone, so a node the waypoints never mention had
   * no editor to offer, no diff anchor either — a diff anchor exists only for
   * files the change touches, and a context node's file by definition is not
   * one — and fell through to a blob permalink on the web.
   *
   * Kept separate from `citations` rather than folded into it, because
   * `citations` also drives coverage and staleness, and a file the change never
   * touches belongs in neither of those.
   */
  const paths = [
    ...new Set([
      ...citations.map((citation) => citation.path),
      ...diagramPaths(document),
    ]),
  ]
  const openable = at === null ? [] : await locallyOpenable(cwd, at, paths)

  return {
    links: { prUrl, anchors },
    coverage,
    openable,
    at: at === null ? null : { repo, sha: at },
  }
}
