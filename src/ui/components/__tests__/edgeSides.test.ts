import { describe, expect, test } from "vitest"
import { sidesFor } from "../Diagram"

/** A card at a position, the size the layout gives every card. */
const at = (x: number, y: number) => ({ x, y, width: 208, height: 76 })

describe("sidesFor", () => {
  describe("a child, which the layout put below its parent", () => {
    test("leaves the bottom and arrives at the top", () => {
      expect(sidesFor("child", at(0, 0), at(0, 200))).toEqual({
        source: "bottom",
        target: "top",
      })
    })

    /*
     * The case that decided the rule. An arm of a fork is further across than
     * it is down, and it is still a step of the function above it: two arms
     * leaving the bottom and a third leaving the side would read as two
     * different kinds of relationship.
     */
    test("still leaves the bottom however far across the fork puts it", () => {
      expect(sidesFor("child", at(0, 0), at(560, 142))).toEqual({
        source: "bottom",
        target: "top",
      })
    })

    test("leaves the top when the target is above, so a loop reads as one", () => {
      expect(sidesFor("child", at(0, 200), at(0, 0))).toEqual({
        source: "top",
        target: "bottom",
      })
    })
  })

  describe("a call, which the layout put in the next column", () => {
    test("leaves the right and arrives at the left", () => {
      expect(sidesFor("call", at(0, 0), at(400, 0))).toEqual({
        source: "right",
        target: "left",
      })
    })

    /*
     * A call out of a deep step into the next function is a long way down as
     * well as across, and it is still a call.
     */
    test("stays sideways even when the target is far below", () => {
      expect(sidesFor("call", at(0, 0), at(400, 900))).toEqual({
        source: "right",
        target: "left",
      })
    })

    test("turns around for a return to a shallower column", () => {
      expect(sidesFor("call", at(400, 0), at(0, 0))).toEqual({
        source: "left",
        target: "right",
      })
    })
  })

  test("falls back to each kind's own axis when a card is not placed", () => {
    expect(sidesFor("child", undefined, at(0, 200))).toEqual({
      source: "bottom",
      target: "top",
    })
    expect(sidesFor("call", at(0, 0), undefined)).toEqual({
      source: "right",
      target: "left",
    })
  })
})
