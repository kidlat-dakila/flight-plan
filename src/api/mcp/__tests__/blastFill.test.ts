import { describe, expect, it } from "vitest"
import { checkBlast, type Blast } from "../../../lib/schemas/diagram/blast"
import {
  assessBlast,
  blastWork,
  fillBlastProse,
  resolveBlastUnproven,
} from "../blastFill"

/**
 * What the agent may write, and what it may not.
 *
 * Built through `checkBlast` rather than by hand, so every fixture is a board
 * the schema accepts and the derivation has already run on it once.
 */
function board(over: Record<string, unknown> = {}): Blast {
  const { blast } = checkBlast({
    type: "blast",
    seed: { diff: { base: "a".repeat(40), head: "b".repeat(40) } },
    nodes: [
      {
        id: "quantity",
        label: "validateQuantity",
        draft: true,
        path: "src/checkout/validations/quantity.ts",
        lines: [1, 3],
        hop: 0,
        changed: true,
        contract: { before: "threw for quantity < 0", now: "throws for quantity <= 0" },
      },
      {
        id: "basket",
        label: "validateBasket",
        draft: true,
        path: "src/checkout/validateBasket.ts",
        lines: [2, 4],
        hop: 1,
      },
      {
        id: "checkout",
        label: "checkout",
        draft: true,
        path: "src/pages/checkout.tsx",
        lines: [2, 4],
        hop: 2,
      },
    ],
    edges: [
      { from: "basket", to: "quantity", kind: "call" },
      { from: "checkout", to: "basket", kind: "call" },
    ],
    ...over,
  })
  if (blast === null) throw new Error("fixture is not a blast")
  return blast
}

const find = (blast: Blast, id: string) => blast.nodes.find((node) => node.id === id)

describe("writing into a blast radius", () => {
  describe("fillBlastProse", () => {
    it("writes a label and clears the mark the walk left", () => {
      const { blast } = fillBlastProse(board(), [
        { id: "basket", label: "Checks the whole basket, quantities included" },
      ])
      expect(find(blast, "basket")?.label).toBe("Checks the whole basket, quantities included")
      expect(find(blast, "basket")?.draft).toBeUndefined()
    })

    it("keeps the mark when only a tag was written", () => {
      const { blast } = fillBlastProse(board(), [{ id: "basket", tag: "validation" }])
      expect(find(blast, "basket")?.draft).toBe(true)
      expect(find(blast, "basket")?.tag).toBe("validation")
    })

    /*
     * An agent that invented an id has lost track of the document, and a partial
     * apply would leave it unable to tell which half of its call landed.
     */
    it("refuses an unknown id and applies nothing", () => {
      const before = board()
      const { blast, unknown } = fillBlastProse(before, [
        { id: "basket", label: "written" },
        { id: "ghost", label: "invented" },
      ])
      expect(unknown).toEqual(["ghost"])
      expect(blast).toBe(before)
    })
  })

  describe("assessBlast", () => {
    it("records a verdict and its reason", () => {
      const { blast } = assessBlast(board(), [
        { id: "basket", changeType: "breaks", effect: "lets the throw out" },
      ])
      expect(find(blast, "basket")?.changeType).toBe("breaks")
      expect(find(blast, "basket")?.effect).toBe("lets the throw out")
    })

    /* One `unaffected` shields everything behind it, in the same call. */
    it("shields everything behind a stop as soon as the stop is written", () => {
      const { blast } = assessBlast(board(), [
        { id: "basket", changeType: "unaffected", effect: "swallows it" },
      ])
      expect(find(blast, "checkout")?.changeType).toBe("unaffected")
      expect(find(blast, "checkout")?.shieldedBy).toBe("basket")
    })

    it("un-shields again when the stop is reassessed as affected", () => {
      const stopped = assessBlast(board(), [
        { id: "basket", changeType: "unaffected", effect: "swallows it" },
      ]).blast
      const { blast } = assessBlast(stopped, [
        { id: "basket", changeType: "breaks", effect: "looked again; it rethrows" },
      ])
      expect(find(blast, "checkout")?.changeType).toBeUndefined()
      expect(find(blast, "checkout")?.shieldedBy).toBeUndefined()
    })

    it("never takes shieldedBy from an edit", () => {
      const { blast } = assessBlast(board(), [
        {
          id: "checkout",
          changeType: "unaffected",
          effect: "mine",
          ...({ shieldedBy: "invented" } as Record<string, unknown>),
        },
      ])
      expect(find(blast, "checkout")?.shieldedBy).toBeUndefined()
    })

    /* A contract states what the change did to a surface. A dependent has none. */
    it("refuses a contract on a node the diff did not touch, writing nothing to it", () => {
      const { blast, refused } = assessBlast(board(), [
        { id: "basket", contract: { before: "was", now: "is" } },
      ])
      expect(refused).toEqual(["basket"])
      expect(find(blast, "basket")?.contract).toBeUndefined()
    })

    /* And the mirror: nothing was done to the change, so it has no verdict. */
    it("refuses a verdict on the change itself", () => {
      const { blast, refused } = assessBlast(board(), [
        { id: "quantity", changeType: "breaks", effect: "mine" },
      ])
      expect(refused).toEqual(["quantity"])
      expect(find(blast, "quantity")?.changeType).toBeUndefined()
    })

    it("accepts a contract on a changed node", () => {
      const { blast, refused } = assessBlast(board(), [
        { id: "quantity", contract: { before: "threw for quantity < 0", now: "throws for quantity <= 0" } },
      ])
      expect(refused).toEqual([])
      expect(find(blast, "quantity")?.contract?.now).toBe("throws for quantity <= 0")
    })

    it("refuses an unknown id and applies nothing", () => {
      const before = board()
      const { blast, unknown } = assessBlast(before, [
        { id: "ghost", changeType: "breaks", effect: "x" },
      ])
      expect(unknown).toEqual(["ghost"])
      expect(blast).toBe(before)
    })
  })

  describe("resolveBlastUnproven", () => {
    const withOpen = () =>
      board({
        nodes: [
          {
            id: "quantity",
            label: "validateQuantity",
            path: "src/checkout/validations/quantity.ts",
            lines: [1, 3],
            hop: 0,
            changed: true,
          },
          {
            id: "src/api/router.ts:40:3",
            label: "handlers[kind]()",
            path: "src/api/router.ts",
            lines: [30, 50],
            hop: 1,
            unproven: { path: "src/api/router.ts", line: 40, reason: "no-binding" },
          },
        ],
        edges: [{ from: "src/api/router.ts:40:3", to: "quantity", kind: "call" }],
      })

    it("records an answer of runtime against the use", () => {
      const { blast } = resolveBlastUnproven(withOpen(), [
        { id: "src/api/router.ts:40:3", runtime: "the handler is chosen from configuration" },
      ])
      expect(find(blast, "src/api/router.ts:40:3")?.unproven?.runtime).toBe(
        "the handler is chosen from configuration",
      )
    })

    /*
     * Naming what a use reaches means new nodes, and new nodes come from a walk.
     * This module cannot add one and should not learn how.
     */
    it("hands named targets back to be walked rather than adding them", () => {
      const before = withOpen()
      const { blast, toWalk } = resolveBlastUnproven(before, [
        {
          id: "src/api/router.ts:40:3",
          targets: [{ path: "src/admin/refunds.ts", name: "refund" }],
        },
      ])
      expect(toWalk).toEqual([
        {
          id: "src/api/router.ts:40:3",
          targets: [{ path: "src/admin/refunds.ts", name: "refund" }],
        },
      ])
      expect(blast.nodes).toHaveLength(before.nodes.length)
    })
  })

  describe("blastWork", () => {
    it("puts the unproven uses first, because everything after them is provisional", () => {
      const work = blastWork(
        board({
          nodes: [
            {
              id: "quantity",
              label: "validateQuantity",
              path: "a.ts",
              lines: [1, 3],
              hop: 0,
              changed: true,
            },
            {
              id: "open",
              label: "handlers[k]()",
              path: "r.ts",
              lines: [1, 9],
              hop: 1,
              unproven: { path: "r.ts", line: 4, reason: "no-binding" },
            },
          ],
          edges: [{ from: "open", to: "quantity", kind: "call" }],
        }),
      )
      expect(work[0]?.needs).toBe("answer")
    })

    /* The inheritance earning its keep: shielded nodes are not work. */
    it("leaves a shielded node off the list entirely", () => {
      const assessed = assessBlast(board(), [
        { id: "basket", changeType: "unaffected", effect: "swallows it" },
      ]).blast
      const work = blastWork(assessed)
      expect(work.some((item) => item.id === "checkout" && item.needs === "verdict")).toBe(false)
      // The change itself is never verdict work; its own work is the contract.
      expect(work.some((item) => item.id === "quantity" && item.needs === "verdict")).toBe(false)
    })
  })
})
