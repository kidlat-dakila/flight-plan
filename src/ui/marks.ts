import type { LineRange } from "../lib/schemas/document/primitives"

/**
 * What a parent waypoint points at, when it points at nothing itself.
 *
 * A breakdown gives the parent the whole body and each child one block of it,
 * so the format writes no marks on the parent: its range *is* its subject,
 * and a mark over all of it would highlight nothing relative to itself. That
 * left the one card in a breakdown that named no lines at all, while every card
 * under it named some.
 *
 * So the panel draws the children's marks on the parent, quietly — the blocks
 * this breaks into, before the reader steps into any of them. Derived rather
 * than authored, because the author has already written every one of these
 * ranges on the cards below and a second copy on the parent would be a second
 * thing to keep in step.
 */

/** Enough of a waypoint to work from, so this can be tested without a fence. */
export type MarkSource = {
  /** Nesting depth as a heading level: 3 for a waypoint, 4 for a child of it. */
  level: number
  /** The file the fence references, or `""` for a fence that names none. */
  path: string
  marks: readonly LineRange[]
}

/**
 * The derived marks for each waypoint, in the same order as the steps given.
 *
 * A waypoint that marks something itself gets none: an authored mark says
 * "this part, here", and a derived band beside it would be a second claim on
 * one card. A waypoint whose fence names no file gets none either, because
 * there is no file on screen for a line number to mean anything in.
 *
 * Descendants, not children: a child that breaks down further marks nothing
 * either, so stopping at the first level down would leave both it and the
 * parent empty. The walk ends at the next waypoint that is not below the one it
 * started from.
 *
 * Ranges are kept in document order and separate. Joining them into one band
 * from the first line to the last would claim the gaps between the blocks,
 * which are the part of the body no child is about.
 */
export function outlineMarks(steps: readonly MarkSource[]): LineRange[][] {
  return steps.map((step, at) => {
    if (step.marks.length > 0 || step.path === "") return []
    const found: LineRange[] = []
    for (let index = at + 1; index < steps.length; index += 1) {
      const next = steps[index]
      if (next === undefined || next.level <= step.level) break
      // A child repeats its parent's file. One that does not is about code
      // this panel is not showing, and its line numbers would land on whatever
      // happens to sit there in the file that is.
      if (next.path !== step.path) continue
      found.push(...next.marks)
    }
    return found
  })
}
