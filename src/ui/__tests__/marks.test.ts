import { describe, expect, test } from "vitest"
import { outlineMarks, type MarkSource } from "../marks"

/*
 * What a parent waypoint shows when it marks nothing itself.
 *
 * A parent's whole range is its subject, so the format gives it no marks of
 * its own. That left its card as the only one in a breakdown with nothing
 * pointed at. These are the marks the panel draws for it, taken from the
 * children that do the pointing.
 */

const step = (
  level: number,
  marks: { from: number; to: number }[],
  path = "a.ts",
): MarkSource => ({ level, path, marks })

describe("outlineMarks", () => {
  test("a parent takes the marks of its children", () => {
    expect(
      outlineMarks([
        step(3, []),
        step(4, [{ from: 227, to: 230 }]),
        step(4, [{ from: 232, to: 236 }]),
      ]),
    ).toEqual([
      [
        { from: 227, to: 230 },
        { from: 232, to: 236 },
      ],
      [],
      [],
    ])
  })

  test("the gaps between the children are kept", () => {
    // Three blocks with two lines between them are three bands, not one from
    // the first line to the last: the gap is the part of the body no child is
    // about, and joining them would claim it.
    const outline = outlineMarks([
      step(3, []),
      step(4, [{ from: 1, to: 2 }]),
      step(4, [{ from: 9, to: 10 }]),
    ])
    expect(outline[0]).toEqual([
      { from: 1, to: 2 },
      { from: 9, to: 10 },
    ])
  })

  test("a waypoint that marks something itself is left alone", () => {
    // An authored mark says "this part, here". A derived one drawn beside it
    // would be a second claim on the same card.
    const outline = outlineMarks([
      step(3, [{ from: 50, to: 51 }]),
      step(4, [{ from: 50, to: 50 }]),
    ])
    expect(outline[0]).toEqual([])
  })

  test("stops at the next waypoint of its own level", () => {
    const outline = outlineMarks([
      step(3, []),
      step(4, [{ from: 1, to: 2 }]),
      step(3, []),
      step(4, [{ from: 8, to: 9 }]),
    ])
    expect(outline[0]).toEqual([{ from: 1, to: 2 }])
    expect(outline[2]).toEqual([{ from: 8, to: 9 }])
  })

  test("reaches past a child to a grandchild", () => {
    // A child that breaks down further marks nothing either, and the lines the
    // grandchildren point at are still inside the parent's range.
    const outline = outlineMarks([
      step(3, []),
      step(4, []),
      step(5, [{ from: 4, to: 5 }]),
    ])
    expect(outline[0]).toEqual([{ from: 4, to: 5 }])
    expect(outline[1]).toEqual([{ from: 4, to: 5 }])
  })

  test("ignores a child that points at another file", () => {
    // Children repeat the parent's file, so one that does not is about code
    // the parent's panel is not showing. Drawing its lines would mark whatever
    // happens to sit at those numbers in the file on screen.
    const outline = outlineMarks([
      step(3, []),
      step(4, [{ from: 1, to: 2 }], "b.ts"),
      step(4, [{ from: 5, to: 6 }]),
    ])
    expect(outline[0]).toEqual([{ from: 5, to: 6 }])
  })

  test("a waypoint with no children and no marks has nothing", () => {
    expect(outlineMarks([step(3, []), step(3, [])])).toEqual([[], []])
  })

  test("a waypoint with no file of its own takes nothing", () => {
    // A waypoint with no reference — a proposal, or no code at all — has no file to
    // mark lines in.
    expect(outlineMarks([step(3, [], ""), step(4, [{ from: 1, to: 2 }])])[0]).toEqual([])
  })

  test("an empty document is an empty table, not a crash", () => {
    expect(outlineMarks([])).toEqual([])
  })
})
