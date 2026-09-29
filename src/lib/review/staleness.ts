import { parseHunkHeader } from "../git/diffFormat"
import type { LineRange } from "../schemas/document/primitives"
import type {
  StoredDocument,
  StoredFence,
  StoredWaypoint,
} from "../schemas/document/stored"
import { sameCommit, type ChangedFile, type GitAdapter } from "../git-adapter/types"

export type { LineRange }

/**
 * How far out of date a walkthrough is, in four tiers.
 *
 * Tiering is the whole point, and it is what keeps the warning worth reading.
 * Keying on "the pull request has moved" would flag every walkthrough within a
 * day: authors push constantly, and most pushes touch nothing the walkthrough
 * talks about. A warning that is always on is a warning nobody reads, and then
 * the one that mattered goes past unnoticed too.
 *
 * So three of the four tiers ask for nothing:
 *
 * - `current`     the walkthrough is written against this commit
 * - `elsewhere`   the pull request moved, but not in any file it cites
 * - `nearby`      a cited file changed, outside the lines it cites
 * - `stale`       cited lines changed, or a cited file is gone
 *
 * Only `stale` means the walkthrough is now describing something that is not
 * there. The rest are reported quietly or not at all.
 */
export type Tier = "current" | "elsewhere" | "nearby" | "stale"

export type Staleness = {
  tier: Tier
  /** The commit the walkthrough was written against. */
  writtenAt: string
  /** The commit the pull request is on now. */
  headNow: string
  /** Cited files whose cited lines changed, or which are gone. */
  affected: string[]
  /** Commits between the two, for saying how far it has moved. */
  commits: number
}

/** Where a walkthrough points: a file, and the lines it cites in it. */
export type Citation = { path: string; ranges: LineRange[] }

/**
 * The files and ranges a walkthrough cites.
 *
 * Read off the stored document: every referenced fence in the tour, then
 * every one on a document-level finding, in that order. A proposal cites no
 * lines that exist, so it contributes nothing.
 */
export function citationsOf(doc: StoredDocument): Citation[] {
  const byPath = new Map<string, LineRange[]>()
  const cite = (code: StoredFence | null): void => {
    if (code === null || code.kind !== "ref") return
    const ranges = byPath.get(code.path) ?? []
    ranges.push(code.focus)
    byPath.set(code.path, ranges)
  }
  const walk = (points: readonly StoredWaypoint[]): void => {
    for (const point of points) {
      cite(point.code)
      if (point.children !== undefined) walk(point.children)
    }
  }
  for (const file of doc.codeWalkthrough.files) walk(file.waypoints)
  for (const found of doc.findings ?? []) cite(found.code)

  return [...byPath].map(([path, ranges]) => ({ path, ranges }))
}

/** Old-side line ranges touched by a unified diff hunk header. */
export function changedOldLines(patch: string): LineRange[] {
  const ranges: LineRange[] = []
  // `@@ -12,7 +12,9 @@`. The old side is what matters: the walkthrough's line
  // numbers are old-side numbers, because it was written against that commit.
  for (const line of patch.split("\n")) {
    const header = parseHunkHeader(line)
    if (header === null) continue
    // A pure insertion has a zero-length old side. It still touches the seam at
    // `oldStart`, so it is treated as covering that line.
    ranges.push({ from: header.oldStart, to: header.oldStart + Math.max(header.oldCount, 1) - 1 })
  }
  return ranges
}

function overlaps(a: LineRange, b: LineRange): boolean {
  return a.from <= b.to && b.from <= a.to
}

/**
 * Works out which tier a walkthrough is in.
 *
 * `compare` is the pull request's own diff between the two commits, so a file
 * the author touched and then reverted correctly counts as unchanged.
 */
export function classify(
  citations: readonly Citation[],
  files: readonly ChangedFile[],
  writtenAt: string,
  headNow: string,
  commits: number,
): Staleness {
  const base: Omit<Staleness, "tier" | "affected"> = { writtenAt, headNow, commits }

  // `sameCommit`, not `===`. Bitbucket returns abbreviated hashes while a
  // walkthrough records the full SHA it was written against, so string equality
  // is false for the same commit and every Bitbucket walkthrough would be
  // reported as out of date on the commit it describes.
  if (sameCommit(writtenAt, headNow)) {
    return { ...base, tier: "current", affected: [] }
  }

  const cited = new Map(citations.map((c) => [c.path, c.ranges]))
  const affected: string[] = []
  let nearby = false

  for (const file of files) {
    // A rename moves the old path out from under the citation, which is the
    // same problem as a deletion for anyone trying to read it.
    const paths = [file.path, file.previousPath].filter(
      (p): p is string => p !== undefined,
    )
    const match = paths.find((p) => cited.has(p))
    if (match === undefined) continue

    if (file.status === "removed" || file.status === "renamed") {
      affected.push(match)
      continue
    }

    const ranges = cited.get(match) ?? []
    if (ranges.length === 0) {
      nearby = true
      continue
    }
    const touched = changedOldLines(file.patch ?? "")
    if (touched.length === 0) {
      // A change with no patch: usually a binary file or one too large for the
      // API to include. Cannot prove the cited lines are fine, so say so.
      affected.push(match)
      continue
    }
    if (ranges.some((range) => touched.some((hunk) => overlaps(range, hunk)))) {
      affected.push(match)
    } else {
      nearby = true
    }
  }

  if (affected.length > 0) return { ...base, tier: "stale", affected }
  if (nearby) return { ...base, tier: "nearby", affected: [] }
  return { ...base, tier: "elsewhere", affected: [] }
}

export async function staleness(
  gitAdapter: GitAdapter,
  citations: readonly Citation[],
  writtenAt: string,
  headNow: string,
): Promise<Staleness> {
  if (sameCommit(writtenAt, headNow)) {
    return { tier: "current", writtenAt, headNow, affected: [], commits: 0 }
  }
  const { files, commits } = await gitAdapter.compare(writtenAt, headNow)
  return classify(citations, files, writtenAt, headNow, commits)
}

export type Notice = {
  level: "info" | "warn"
  /** One sentence. It is read at a glance or not at all. */
  text: string
  /**
   * The particulars, shown on hover rather than in the banner.
   *
   * Which files moved and which commit is being read is real information and
   * some readers want it, but it is not what decides whether to act. Keeping it
   * here means shortening the banner costs nothing that cannot be recovered.
   */
  detail?: string
  /** Bring it up to date, keeping whatever a person wrote. */
  prompt: string
  /**
   * Buttons that do something rather than copy something.
   *
   * Empty for a staleness notice, whose whole answer is a prompt to paste. The
   * git-mode notice is the one that has actions: the reader is not being asked
   * to regenerate anything, they are being told two specific things they could
   * do — configure a host, or fetch the branch — and a banner that named them
   * without offering them would be a banner that describes the fix and makes
   * the reader go and find it.
   */
  actions?: ("setup" | "fetch")[]
  /** The branch a fetch would fetch, when there is one. */
  branch?: string | null
}

/**
 * What to tell the reader, if anything.
 *
 * `current` and `elsewhere` say nothing at all. The pull request moving is not
 * news; the walkthrough still describes what it describes. Saying so on every
 * open would train people to ignore the banner, and the banner has one job.
 */
export function noticeFor(state: Staleness, prompt: string): Notice | null {
  const moved =
    state.commits === 1 ? "1 commit" : `${String(state.commits)} commits`

  if (state.tier === "current" || state.tier === "elsewhere") return null

  if (state.tier === "nearby") {
    return {
      level: "info",
      text: `This Flight Plan walkthrough is behind ${moved}, but not in the lines it points at.`,
      prompt,
    }
  }

  /*
   * One sentence, with the particulars on hover.
   *
   * This used to name the affected files, the commit the walkthrough was
   * written at, and what that meant, and it ran to four lines above the
   * document. A banner that long is one people learn to scroll past, which
   * costs exactly the warning it exists to deliver. The count is the part that
   * decides whether to act; `detail` keeps the rest addressable for a reader
   * who wants it, rather than throwing it away.
   */
  const list =
    state.affected.length <= 3
      ? state.affected.join(", ")
      : `${state.affected.slice(0, 3).join(", ")} and ${String(state.affected.length - 3)} more`

  return {
    level: "warn",
    text: `Out of date: This Flight Plan walkthrough is behind ${moved}.`,
    detail:
      `The lines it points at have changed in ${list}. You are reading the ` +
      `code as it was at ${state.writtenAt.slice(0, 8)}, which is what the ` +
      `walkthrough describes, not what the pull request contains now.`,
    prompt,
  }
}
