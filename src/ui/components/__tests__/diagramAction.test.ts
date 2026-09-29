import { describe, expect, test } from "vitest"
import { actionFor } from "../Diagram"
import type { DiagramNode } from "../../../lib/schemas/diagram/schema"

const node = (extra: Partial<DiagramNode> = {}): DiagramNode =>
  ({ id: "n", type: "logic", label: "Handles the case", ...extra }) as DiagramNode

/** This node's own panel. */
const panels = new Map([["n", 2]])

describe("actionFor", () => {
  test("a node with a panel shows its own", () => {
    // A node is clickable when the host prepared a code panel for it.
    expect(actionFor(node(), panels)).toEqual({ panel: 2 })
  })

  test("a node with no panel is inert", () => {
    expect(actionFor(node(), new Map())).toBeNull()
  })
})
