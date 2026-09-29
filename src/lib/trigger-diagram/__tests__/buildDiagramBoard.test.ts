import { describe, expect, it } from "vitest"
import { checkDiagram } from "../../schemas/diagram/schema"
import type { DiagramNode as CodeGraphNode, ExecutionStep, Range } from "../../codegraph/types"
import { buildDiagramBoard } from "../buildDiagramBoard"

const span = (from: number, to: number): Range => ({
  start: { line: from, column: 0 },
  end: { line: to, column: 0 },
})

/** A codegraph function node, terse. */
function node(
  file: string,
  name: string,
  line: number,
  extra: Partial<CodeGraphNode> = {},
): CodeGraphNode {
  return {
    id: { file, line },
    code: { file, name, definedAt: span(line, line), enclosingRange: span(line, line + 2) },
    callers: [],
    ...extra,
  }
}

const step: ExecutionStep = { line: 1, text: "return 1", range: span(1, 1), type: "return", changed: true }

/** The checked edges of a board, as `source->target` with kind. */
function edges(graph: CodeGraphNode[]): { pair: string; kind: string }[] {
  const { diagram, problems } = checkDiagram(buildDiagramBoard(graph))
  expect(problems).toEqual([])
  expect(diagram).not.toBeNull()
  return (diagram?.edges ?? []).map((edge) => ({ pair: `${edge.source}->${edge.target}`, kind: edge.kind }))
}

describe("buildDiagramBoard reading model", () => {
  it("lays a cross-file call chain as call edges, left to right toward the change", () => {
    // order → checkout → priceOf(change). codegraph is inverted: change is root,
    // callers climb to the entry.
    const change = node("pricing.ts", "priceOf", 1, {
      executionSteps: [step],
      callers: [
        node("checkout.ts", "checkout", 1, {
          calledAt: span(2, 2),
          callers: [node("order.ts", "order", 1, { calledAt: span(2, 2) })],
        }),
      ],
    })
    const found = edges([change])
    // The caller sits to the left of what it calls: a left→right call edge.
    expect(found).toContainEqual({ pair: "checkout.ts:1->pricing.ts:1", kind: "call" })
    expect(found).toContainEqual({ pair: "order.ts:1->checkout.ts:1", kind: "call" })
  })

  it("nests a function's execution steps under it as child edges", () => {
    const change = node("pricing.ts", "priceOf", 1, { executionSteps: [step] })
    const found = edges([change])
    expect(found.some((edge) => edge.kind === "child" && edge.pair.startsWith("pricing.ts:1->"))).toBe(true)
  })

  it("draws a value handoff as a value edge, not a call edge", () => {
    const change = node("pricing.ts", "priceOf", 1, {
      executionSteps: [step],
      callers: [node("Child.tsx", "Child", 1, { via: "value", calledAt: span(2, 2) })],
    })
    const found = edges([change])
    expect(found).toContainEqual({ pair: "Child.tsx:1->pricing.ts:1", kind: "value" })
  })

  it("emits an escape marker node reached by a value edge", () => {
    const change = node("pricing.ts", "priceOf", 1, {
      executionSteps: [step],
      callers: [
        {
          id: { file: "wire.ts", line: 5 },
          code: {
            file: "wire.ts",
            name: "escapes: spread",
            definedAt: span(5, 5),
            enclosingRange: span(5, 5),
          },
          via: "value",
          escape: { reason: "spread", at: span(5, 5) },
          callers: [],
        },
      ],
    })
    const { diagram } = checkDiagram(buildDiagramBoard([change]))
    const marker = diagram?.nodes.find((one) => one.escape === true)
    expect(marker?.label).toContain("spread")
    expect((diagram?.edges ?? []).some((edge) => edge.target === "pricing.ts:1" && edge.kind === "value")).toBe(
      true,
    )
  })
})

/*
 * The scaffold writes the identifier where the identifier belongs.
 *
 * It used to put the declaration name in `label` and the file path in
 * `sublabel`, which is both fields wrong: the instructions say a label says
 * what the code *does* and a sublabel names the symbol. An agent therefore
 * overwrote every sublabel with a value the parser already had, and a label
 * nobody rewrote shipped as raw code.
 */
describe("buildDiagramBoard labels", () => {
  const board = (graph: CodeGraphNode[]) => {
    const { diagram, problems } = checkDiagram(buildDiagramBoard(graph))
    expect(problems).toEqual([])
    return diagram
  }

  it("puts the declaration name in sublabel, not the file path", () => {
    const found = board([node("pricing.ts", "priceOf", 1, { executionSteps: [step] })])
    const card = found?.nodes.find((one) => one.id === "pricing.ts:1")
    expect(card?.sublabel).toBe("priceOf")
  })

  it("marks the placeholder label draft, so the worklist can ask for a real one", () => {
    const found = board([node("pricing.ts", "priceOf", 1, { executionSteps: [step] })])
    const card = found?.nodes.find((one) => one.id === "pricing.ts:1")
    expect(card?.label).toBe("priceOf")
    expect(card?.draft).toBe(true)
  })

  it("marks an escape card draft too: its name is synthetic, not a reading", () => {
    const change = node("pricing.ts", "priceOf", 1, {
      executionSteps: [step],
      callers: [
        node("ui.tsx", "spread props", 1, {
          escape: { reason: "spread", at: span(5, 5) },
          via: "value",
        }),
      ],
    })
    const found = board([change])
    const marker = found?.nodes.find((one) => one.id === "ui.tsx:1")
    expect(marker?.sublabel).toBe("spread props")
    expect(marker?.draft).toBe(true)
  })

  it("leaves out what a change calls: it is not a use of the change", () => {
    const change = node("checkout.ts", "checkout", 1, {
      executionSteps: [step],
      children: [node("pricing.ts", "priceOf", 1, { calledAt: span(2, 2), via: "call" })],
    })
    expect(buildDiagramBoard([change]).nodes.map((one) => one.id)).toEqual(["checkout.ts:1"])
  })
})

/*
 * The board the scaffold stores: trigger → end → start.
 *
 * A start is a change; an end is what uses it directly; a trigger is the top
 * of each chain above an end. What lies between a trigger and its end, and
 * what a change calls, is left out: every node on the board is one the agent
 * labels, and those are the ones a reader needs.
 */
describe("buildDiagramBoard trigger, end, start", () => {
  /** The ids and the checked edges, with variant, of a board. */
  const read = (graph: CodeGraphNode[]) => {
    const { diagram, problems } = checkDiagram(buildDiagramBoard(graph))
    expect(problems).toEqual([])
    return {
      ids: (diagram?.nodes ?? []).filter((one) => !one.id.includes("#")).map((one) => one.id).sort(),
      edges: (diagram?.edges ?? [])
        .filter((edge) => edge.kind !== "child")
        .map((edge) => `${edge.source} -${edge.kind}${edge.variant === "dashed" ? ", skipped" : ""}-> ${edge.target}`)
        .sort(),
    }
  }

  it("joins a trigger to its end directly, skipping what is between", () => {
    // route → Page → BasketForm ⇒ action (change)
    const change = node("action.ts", "action", 1, {
      executionSteps: [step],
      callers: [
        node("BasketForm.tsx", "BasketForm", 1, {
          via: "value",
          callers: [node("Page.tsx", "Page", 1, { callers: [node("route.tsx", "route", 1)] })],
        }),
      ],
    })
    expect(read([change])).toEqual({
      ids: ["BasketForm.tsx:1", "action.ts:1", "route.tsx:1"],
      edges: ["BasketForm.tsx:1 -value-> action.ts:1", "route.tsx:1 -call, skipped-> BasketForm.tsx:1"],
    })
  })

  it("keeps a direct caller of an end as it is, not skipped", () => {
    const change = node("action.ts", "action", 1, {
      executionSteps: [step],
      callers: [node("BasketForm.tsx", "BasketForm", 1, { callers: [node("route.tsx", "route", 1)] })],
    })
    expect(read([change]).edges).toEqual(["BasketForm.tsx:1 -call-> action.ts:1", "route.tsx:1 -call-> BasketForm.tsx:1"])
  })

  it("draws every trigger above an end, and none above an end nothing calls", () => {
    const change = node("action.ts", "action", 1, {
      executionSteps: [step],
      callers: [
        node("Form.tsx", "Form", 1, {
          callers: [
            node("Mid.tsx", "Mid", 1, { callers: [node("a.tsx", "a", 1), node("b.tsx", "b", 1)] }),
          ],
        }),
        node("cli.ts", "cli", 1),
      ],
    })
    expect(read([change])).toEqual({
      ids: ["Form.tsx:1", "a.tsx:1", "action.ts:1", "b.tsx:1", "cli.ts:1"],
      edges: [
        "Form.tsx:1 -call-> action.ts:1",
        "a.tsx:1 -call, skipped-> Form.tsx:1",
        "b.tsx:1 -call, skipped-> Form.tsx:1",
        "cli.ts:1 -call-> action.ts:1",
      ],
    })
  })

  it("stops the climb at another change, which is drawn anyway", () => {
    // Shell (change) → Mid → Form ⇒ action (change); Shell's own caller is root.
    const change = node("action.ts", "action", 1, {
      executionSteps: [step],
      callers: [
        node("Form.tsx", "Form", 1, {
          callers: [
            node("Mid.tsx", "Mid", 1, {
              callers: [node("Shell.tsx", "Shell", 1, { executionSteps: [step], callers: [node("root.tsx", "root", 1)] })],
            }),
          ],
        }),
      ],
    })
    expect(read([change])).toEqual({
      ids: ["Form.tsx:1", "Shell.tsx:1", "action.ts:1", "root.tsx:1"],
      edges: [
        "Form.tsx:1 -call-> action.ts:1",
        "Shell.tsx:1 -call, skipped-> Form.tsx:1",
        "root.tsx:1 -call-> Shell.tsx:1",
      ],
    })
  })

  it("keeps a node the change calls when it also uses a change", () => {
    // checkout (change) calls tax, and tax calls priceOf (change).
    const price = node("pricing.ts", "priceOf", 1, { executionSteps: [step] })
    const checkout = node("checkout.ts", "checkout", 1, {
      executionSteps: [step],
      children: [node("tax.ts", "tax", 1, { calledAt: span(2, 2), via: "call" })],
    })
    price.callers = [node("tax.ts", "tax", 1)]
    expect(read([price, checkout]).ids).toEqual(["checkout.ts:1", "pricing.ts:1", "tax.ts:1"])
  })

  it("ends a climb that loops", () => {
    // As codegraph writes a loop: the climb stops at a leaf that repeats an id.
    const loop = node("a.ts", "a", 1, { callers: [node("b.ts", "b", 1, { callers: [node("a.ts", "a", 1)] })] })
    const change = node("action.ts", "action", 1, {
      executionSteps: [step],
      callers: [node("Form.tsx", "Form", 1, { callers: [loop] })],
    })
    expect(read([change]).ids).toEqual(["Form.tsx:1", "action.ts:1"])
  })
})
