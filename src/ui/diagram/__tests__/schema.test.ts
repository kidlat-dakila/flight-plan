import { CODE_NODE_TYPES, checkDiagram, parseDiagram } from "../../../lib/schemas/diagram/schema"
import { layout } from "../layout"

describe("diagram", () => {
  const node = (over: Record<string, unknown> = {}) => ({
    id: "a",
    type: "logic",
    label: "doThing()",
    ...over,
  })
  const good = {
    type: "code",
    nodes: [
      node({ edges: [{ target: "b" }] }),
      node({ id: "b", type: "guard", label: "check()" }),
    ],
  }

  describe("checkDiagram", () => {
    it("should accept a well-formed code diagram", () => {
      const { diagram, problems } = checkDiagram(good)
      expect(problems).toEqual([])
      expect(diagram?.nodes.map((n) => n.id)).toEqual(["a", "b"])
    })

    /*
     * The tree. `nodes` is a forest and an edge into a child is the nesting
     * itself, so the two shapes below draw the same board.
     */
    describe("children", () => {
      it("should flatten a nested node into the node list, parent first", () => {
        const { diagram, problems } = checkDiagram({
          type: "code",
          nodes: [
            {
              ...node(),
              children: [
                { ...node({ id: "b" }), children: [node({ id: "c" })] },
              ],
            },
          ],
        })
        expect(problems).toEqual([])
        expect(diagram?.nodes.map((n) => n.id)).toEqual(["a", "b", "c"])
      })

      it("should imply the edge into each child, so a sequence needs none", () => {
        const { diagram } = checkDiagram({
          type: "code",
          nodes: [
            { ...node(), children: [{ ...node({ id: "b" }), children: [node({ id: "c" })] }] },
          ],
        })
        expect(diagram?.edges).toEqual([
          { source: "a", target: "b", kind: "child" },
          { source: "b", target: "c", kind: "child" },
        ])
      })

      it("should fork on siblings", () => {
        const { diagram } = checkDiagram({
          type: "code",
          nodes: [{ ...node(), children: [node({ id: "yes" }), node({ id: "no" })] }],
        })
        expect(diagram?.edges.map((e) => e.target)).toEqual(["yes", "no"])
      })

      it("should let an edge written by hand carry the label on that arm", () => {
        const { diagram } = checkDiagram({
          type: "code",
          nodes: [
            {
              ...node(),
              edges: [{ target: "no", label: "out of stock", variant: "security" }],
              children: [node({ id: "yes" }), node({ id: "no" })],
            },
          ],
        })
        /*
         * One edge to "no", not two: the written one replaces the implied one,
         * and stays a `child` so labelling an arm does not move it into the
         * next column.
         */
        expect(diagram?.edges).toEqual([
          { source: "a", target: "yes", kind: "child" },
          {
            source: "a",
            target: "no",
            label: "out of stock",
            variant: "security",
            kind: "child",
          },
        ])
      })

      it("should carry an edge to a node declared somewhere else in the tree", () => {
        const { diagram, problems } = checkDiagram({
          type: "code",
          nodes: [
            { ...node(), edges: [{ target: "far" }] },
            node({ id: "far" }),
          ],
        })
        expect(problems).toEqual([])
        expect(diagram?.edges).toEqual([{ source: "a", target: "far", kind: "call" }])
      })

      it("should report an id used twice, wherever in the tree it is", () => {
        const { problems } = checkDiagram({
          type: "code",
          nodes: [{ ...node(), children: [node({ id: "a" })] }],
        })
        expect(problems.map((p) => p.message)).toContain('two nodes share the id "a"')
      })

      it("should lose one malformed child rather than its parent or its siblings", () => {
        const { diagram, problems } = checkDiagram({
          type: "code",
          nodes: [
            { ...node(), children: [{ id: "b", type: "nonsense" }, node({ id: "c" })] },
          ],
        })
        expect(diagram?.nodes.map((n) => n.id)).toEqual(["a", "c"])
        expect(problems).toHaveLength(1)
      })
    })

    it("should reject a diagram type it does not render", () => {
      // One schema per diagram type, so an unknown type is not a node problem.
      expect(checkDiagram({ type: "sequence", nodes: [] }).diagram).toBeNull()
    })

    it("should reject anything that is not an object", () => {
      expect(checkDiagram("nodes").diagram).toBeNull()
      expect(checkDiagram(null).diagram).toBeNull()
    })

    it("should report an edge naming a node that was never declared", () => {
      const { problems } = checkDiagram({
        type: "code",
        nodes: [node({ edges: [{ target: "ghost" }] })],
      })
      expect(problems.map((p) => p.message)).toContain(
        'edge names target "ghost", which is not a node',
      )
    })

    it("should report two nodes sharing an id", () => {
      const { problems } = checkDiagram({ ...good, nodes: [node(), node()] })
      expect(problems.map((p) => p.message)).toContain('two nodes share the id "a"')
    })

    it("should report a node type outside the enum, naming the node and the field", () => {
      const { problems } = checkDiagram({ ...good, nodes: [node({ type: "wizard" })] })
      const message = problems[0]?.message ?? ""
      expect(message).toContain('node "a"')
      expect(message).toContain("type")
      // The options are listed, so an agent can correct itself in one step.
      expect(message).toContain(CODE_NODE_TYPES[0])
    })

    it("should report an orphan only when the diagram has edges", () => {
      const withEdges = checkDiagram({
        type: "code",
        nodes: [node({ edges: [{ target: "b" }] }), node({ id: "b" }), node({ id: "lonely" })],
      })
      expect(withEdges.problems.map((p) => p.message)).toContain(
        'node "lonely" has no edges',
      )
      // A single-node diagram is legal, so silence here is deliberate.
      const alone = checkDiagram({ type: "code", nodes: [node()] })
      expect(alone.problems).toEqual([])
    })

    it("should keep a usable diagram when only some nodes are bad", () => {
      // A malformed node must not blank the whole board.
      const { diagram, problems } = checkDiagram({
        ...good,
        nodes: [node(), { id: "bad" }],
      })
      expect(diagram?.nodes.map((n) => n.id)).toEqual(["a"])
      expect(problems.length).toBeGreaterThan(0)
    })

    it("should keep the node but drop the fourth source", () => {
      const { diagram, problems } = checkDiagram({
        type: "code",
        nodes: [
          node({
            sources: [
              { path: "a.ts" },
              { path: "b.ts" },
              { path: "c.ts" },
              { path: "d.ts" },
            ],
          }),
        ],
        edges: [],
      })
      expect(diagram?.nodes[0]?.sources).toHaveLength(3)
      expect(problems.map((p) => p.message)).toContain(
        'node "a" has more than three sources; the rest are ignored',
      )
    })

    it("should order a reversed source range", () => {
      const { diagram } = checkDiagram({
        type: "code",
        nodes: [node({ sources: [{ path: "a.ts", lines: [40, 10] }] })],
        edges: [],
      })
      expect(diagram?.nodes[0]?.sources?.[0]?.lines).toEqual({ from: 10, to: 40 })
    })

  })

  describe("parseDiagram", () => {
    it("should report malformed JSON rather than throwing", () => {
      const { diagram, problems } = parseDiagram("{ nope")
      expect(diagram).toBeNull()
      expect(problems[0]?.message).toContain("not valid JSON")
    })

    it("should parse a fence body", () => {
      expect(parseDiagram(JSON.stringify(good)).diagram?.nodes).toHaveLength(2)
    })
  })

  describe("layout", () => {
    const ir = checkDiagram(good).diagram!

    it("should place every node", () => {
      const placed = layout(ir)
      expect([...placed.keys()].sort()).toEqual(["a", "b"])
    })

    /*
     * The two axes. A call is the next column across and a step is the next row
     * down, and the whole point of the layout is that one board carries both.
     */
    it("should lay a call out left to right", () => {
      const placed = layout(ir)
      // `a` calls `b`, so `b` is the column to its right.
      expect(placed.get("b")!.x).toBeGreaterThan(placed.get("a")!.x)
    })

    it("should lay the steps inside a function out top to bottom", () => {
      const { diagram } = checkDiagram({
        type: "code",
        nodes: [
          {
            id: "gate",
            type: "guard",
            label: "Refuses an order it cannot fulfil",
            children: [
              {
                id: "first",
                type: "logic",
                label: "Reads every line in one query",
                children: [
                  { id: "second", type: "logic", label: "Compares what is reserved" },
                ],
              },
            ],
          },
        ],
      })
      const placed = layout(diagram!)
      const [gate, first, second] = [
        placed.get("gate")!,
        placed.get("first")!,
        placed.get("second")!,
      ]
      expect(first.y).toBeGreaterThan(gate.y)
      expect(second.y).toBeGreaterThan(first.y)
      // Down, not across: a chain of steps stays in its function's column.
      expect(first.x).toBe(gate.x)
    })

    it("should fork a branch into two paths side by side", () => {
      const { diagram } = checkDiagram({
        type: "code",
        nodes: [
          {
            id: "gate",
            type: "guard",
            label: "Refuses an unknown order",
            children: [
              { id: "yes", type: "logic", label: "Reserves the stock" },
              { id: "no", type: "logic", label: "Answers with the reason" },
            ],
          },
        ],
      })
      const placed = layout(diagram!)
      const [yes, no] = [placed.get("yes")!, placed.get("no")!]
      // Both arms below the branch, and beside each other rather than stacked.
      expect(yes.y).toBeGreaterThan(placed.get("gate")!.y)
      expect(no.y).toBe(yes.y)
      expect(no.x).not.toBe(yes.x)
    })

    it("should keep a function's steps out of the column its call goes to", () => {
      const { diagram } = checkDiagram({
        type: "code",
        nodes: [
          {
            id: "outer",
            type: "logic",
            label: "Prepares the request",
            edges: [{ target: "inner" }],
            children: [{ id: "step", type: "logic", label: "Builds the body" }],
          },
          { id: "inner", type: "logic", label: "Sends it" },
        ],
      })
      const placed = layout(diagram!)
      const [outer, step, inner] = [
        placed.get("outer")!,
        placed.get("step")!,
        placed.get("inner")!,
      ]
      expect(step.x).toBe(outer.x)
      expect(inner.x).toBeGreaterThan(step.x + step.width)
    })
  })
})

describe("the retired entry node type", () => {
  it("should no longer be a node type", () => {
    expect(CODE_NODE_TYPES).not.toContain("entry")
  })

  it("should tell an author where entry points went", () => {
    const { problems } = checkDiagram({
      type: "code",
      nodes: [{ id: "start", type: "entry", label: "A customer presses Pay" }],
    })
    expect(
      problems.some(
        (p) =>
          p.message.includes('node "start"') && p.message.includes("`entries`"),
      ),
    ).toBe(true)
  })
})

describe("the retired test node type", () => {
  it("should no longer be a node type", () => {
    expect(CODE_NODE_TYPES).not.toContain("test")
  })

  it("should tell an author why a test is not on the board", () => {
    const { problems } = checkDiagram({
      type: "code",
      nodes: [{ id: "spec", type: "test", label: "Runs the suite with stub limits" }],
    })
    expect(
      problems.some(
        (p) => p.message.includes('node "spec"') && p.message.includes("call stack"),
      ),
    ).toBe(true)
  })
})
