/**
 * Which waypoints share a code panel.
 *
 * Full screen stacks every waypoint's code into one scroller, one panel each,
 * and a walkthrough that visits a file three times drew that file three times:
 * three headers with the same path, three copies of the code, and line numbers
 * that restarted at every one. A file of six hundred lines or fewer is shown
 * whole, so those three panels were not even different views of it — they were
 * the same lines, pixel for pixel.
 *
 * A run is consecutive, never gathered: the order waypoints are written in is
 * the walkthrough's argument, and collecting every mention of a file would
 * rewrite it into a file listing. Two visits with a third file between them
 * stay two panels, which is what the author asked for.
 */

/** What deciding a run needs to know about a waypoint. */
export type PanelStep = {
  /** The file, or null for a fence carrying its own code. */
  filePath: string | null
  /** File line the panel's first rendered line came from. */
  fileStart: number
  /** Code that does not exist yet, spliced into the file it would change. */
  proposed?: boolean
  /** The rendered text, which is what says two panels show the same window. */
  value: string
}

/**
 * The waypoints each panel serves, in document order.
 *
 * Grouped on the window rather than on the path alone, and that is the part
 * worth stating: two waypoints far apart in a long file are windowed around
 * their own lines, and drawing one panel for them would have to show every line
 * between — hundreds a reader did not ask for. When the host has given them one
 * window they are the same panel; when it has not, they stay apart.
 *
 * A proposal never joins a run. It renders lines that are not in the file, so
 * the panel beside it is a different document with the same name.
 */
export function panelRuns(steps: readonly PanelStep[]): number[][] {
  const runs: number[][] = []

  steps.forEach((step, index) => {
    const last = runs[runs.length - 1]
    const previous = last === undefined ? undefined : steps[last[last.length - 1] ?? -1]
    const joins =
      last !== undefined &&
      previous !== undefined &&
      step.filePath !== null &&
      previous.filePath === step.filePath &&
      previous.proposed !== true &&
      step.proposed !== true &&
      previous.fileStart === step.fileStart &&
      previous.value === step.value

    if (joins && last !== undefined) last.push(index)
    else runs.push([index])
  })

  return runs
}

type AnchorState = "matched" | "repaired" | "lost" | "none"

const SEVERITY: Record<AnchorState, number> = { none: 0, matched: 1, repaired: 2, lost: 3 }

/**
 * What a shared panel says about its anchors: the worst of its members.
 *
 * A panel shared by several waypoints used to report only its first card's
 * state, so a lost range on the second card was drawn as matched code with no
 * warning. The worst state wins (`lost` over `repaired` over `matched`), and
 * `moved` says a member was repaired even when another is lost, so the panel
 * can carry both badges.
 */
export function panelAnchorOf(
  members: readonly { anchor?: AnchorState; shifted?: number }[],
): { anchor: AnchorState; shifted?: number; moved: boolean } {
  let anchor: AnchorState = "none"
  let shifted: number | undefined
  let moved = false
  for (const member of members) {
    const state = member.anchor ?? "none"
    if (state === "repaired") {
      moved = true
      shifted ??= member.shifted
    }
    if (SEVERITY[state] > SEVERITY[anchor]) anchor = state
  }
  return { anchor, ...(shifted === undefined ? {} : { shifted }), moved }
}
