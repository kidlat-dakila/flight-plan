import { checkBlast, type Blast, type BlastNode } from "../../../lib/schemas/diagram/blast"
import {
  BLAST_NODE_HEIGHT,
  BLAST_NODE_WIDTH,
  RING,
  blastExtent,
  borderPoint,
  fileNodeId,
  groupsOf,
  layoutBlast,
  openOnArrival,
  pathOfFileNode,
  projectBlast,
  radiusOf,
  verdictOf,
  worseOf,
} from "../blastLayout"

describe("blastLayout", () => {
  const raw = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    label: id,
    path: `${id}.ts`,
    lines: [1, 5],
    hop: 1,
    ...over,
  })

  const board = (
    nodes: Record<string, unknown>[],
    edges: Record<string, unknown>[] = [],
  ): Blast => {
    const { blast, problems } = checkBlast({
      type: "blast",
      seed: { diff: { base: "a".repeat(40), head: "b".repeat(40) } },
      nodes,
      edges,
    })
    if (blast === null) throw new Error(problems.map((p) => p.message).join("; "))
    return blast
  }

  describe("worseOf", () => {
    /*
     * The ordering that makes a collapsed file honest. A file holding one
     * unassessed node and nine unaffected ones is not an unaffected file.
     */
    it("should rank unassessed above unaffected", () => {
      expect(worseOf("unassessed", "unaffected")).toBe("unassessed")
    })

    it("should rank a real verdict above unassessed", () => {
      expect(worseOf("unassessed", "behaviour-changes")).toBe("behaviour-changes")
      expect(worseOf("breaks", "behaviour-changes")).toBe("breaks")
    })

    /*
     * The change itself is not unaffected, and a card that holds it said so:
     * every changed node read "Unaffected".
     */
    it("should rank the change itself between the verdicts and unassessed", () => {
      expect(worseOf("changed", "unaffected")).toBe("changed")
      expect(worseOf("changed", "unassessed")).toBe("changed")
      expect(worseOf("changed", "breaks")).toBe("breaks")
    })

    it("should give a changed node the changed verdict", () => {
      const node = board([raw("seed", { changed: true, hop: 0 })]).nodes[0] as BlastNode
      expect(verdictOf(node)).toBe("changed")
    })
  })

  describe("groupsOf", () => {
    it("should collect the declarations of one file into one group", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/one.ts" }),
          raw("b", { hop: 2, path: "src/one.ts" }),
        ]),
      )
      expect(groups).toHaveLength(1)
      expect(groups[0]?.ids).toEqual(["a", "b"])
    })

    it("should take a file's hop from its innermost declaration", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/one.ts" }),
          raw("b", { hop: 4, path: "src/one.ts" }),
        ]),
      )
      expect(groups[0]?.hop).toBe(0)
    })

    it("should show a file's worst verdict, not its commonest", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true }),
          raw("b", {
            path: "src/many.ts",
            changeType: "unaffected",
            effect: "x",
          }),
          raw("c", { path: "src/many.ts", changeType: "breaks", effect: "y" }),
          raw("d", { path: "src/many.ts", changeType: "unaffected", effect: "z" }),
        ]),
      )
      expect(groups.find((g) => g.path === "src/many.ts")?.worst).toBe("breaks")
    })

    it("should count only the verdicts somebody authored", () => {
      const blast = board(
        [
          raw("a", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          raw("stop", {
            path: "src/many.ts",
            changeType: "unaffected",
            effect: "swallows it",
          }),
          raw("far", { path: "src/many.ts", hop: 2 }),
        ],
        [
          { from: "stop", to: "a", kind: "call" },
          { from: "far", to: "stop", kind: "call" },
        ],
      )
      // `far` is shielded, so its verdict is derived and must not be counted.
      expect(groupsOf(blast).find((g) => g.path === "src/many.ts")?.authored).toBe(1)
    })

    it("should order files by ring, then by severity", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
          raw("mild", { hop: 1, path: "src/mild.ts", changeType: "unaffected", effect: "x" }),
          raw("bad", { hop: 1, path: "src/bad.ts", changeType: "breaks", effect: "y" }),
          raw("far", { hop: 2, path: "src/far.ts" }),
        ]),
      )
      expect(groups.map((g) => g.path)).toEqual([
        "src/change.ts",
        "src/bad.ts",
        "src/mild.ts",
        "src/far.ts",
      ])
    })

    it("should flag a file holding an unanswered unprovable use", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
          raw("open", { path: "src/router.ts", unproven: { path: "src/router.ts", line: 4 } }),
        ]),
      )
      expect(groups.find((g) => g.path === "src/router.ts")?.unproven).toBe(true)
    })

    it("should stop flagging an unprovable use the agent answered", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
          raw("open", {
            path: "src/router.ts",
            unproven: { path: "src/router.ts", line: 4, runtime: "from config" },
          }),
        ]),
      )
      expect(groups.find((g) => g.path === "src/router.ts")?.unproven).toBe(false)
    })
  })

  describe("openOnArrival", () => {
    it("should open every file, so the board arrives as the graph it is", () => {
      const groups = groupsOf(
        board([
          raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
          raw("bad", { path: "src/bad.ts", changeType: "breaks", effect: "y" }),
          raw("open", { path: "src/router.ts", unproven: { path: "src/router.ts", line: 4 } }),
          raw("mild", { path: "src/mild.ts", changeType: "unaffected", effect: "x" }),
        ]),
      )
      expect(openOnArrival(groups)).toEqual(
        new Set(["src/change.ts", "src/bad.ts", "src/router.ts", "src/mild.ts"]),
      )
    })

    it("should open a board with no files at all without complaint", () => {
      expect(openOnArrival([])).toEqual(new Set())
    })
  })

  describe("borderPoint", () => {
    /* A card the size the layout gives every card, centred on the origin. */
    const card = { x: -88, y: -41, width: 176, height: 82 }

    it("should leave through the right edge for a card to the right", () => {
      expect(borderPoint(card, { x: 1000, y: 0 })).toEqual({ x: 88, y: 0 })
    })

    it("should leave through the top edge for a card above", () => {
      expect(borderPoint(card, { x: 0, y: -1000 })).toEqual({ x: 0, y: -41 })
    })

    /*
     * The case fixed handles get wrong. Straight up and to the right, the ray
     * leaves through the top of a wide card — not its corner, and not its
     * side.
     */
    it("should leave through the edge the ray actually crosses on a diagonal", () => {
      const point = borderPoint(card, { x: 100, y: -100 })
      expect(point.y).toBeCloseTo(-41)
      expect(point.x).toBeCloseTo(41)
    })

    it("should land exactly on the corner when the ray runs through it", () => {
      expect(borderPoint(card, { x: 176, y: 82 })).toEqual({ x: 88, y: 41 })
    })

    it("should stay on the border when the other card is inside this one", () => {
      const point = borderPoint(card, { x: 10, y: 0 })
      expect(point).toEqual({ x: 88, y: 0 })
    })

    it("should give the centre when there is no direction to leave in", () => {
      expect(borderPoint(card, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    })
  })

  describe("blastExtent", () => {
    it("should count the far card's own size, not just its corner", () => {
      expect(blastExtent([{ x: 0, y: 0 }, { x: 100, y: 40 }])).toEqual({
        width: 100 + BLAST_NODE_WIDTH,
        height: 40 + BLAST_NODE_HEIGHT,
      })
    })

    it("should give one card the size of one card", () => {
      expect(blastExtent([{ x: -5, y: 9 }])).toEqual({
        width: BLAST_NODE_WIDTH,
        height: BLAST_NODE_HEIGHT,
      })
    })

    it("should have no extent for an empty board", () => {
      expect(blastExtent([])).toBeNull()
    })
  })

  describe("layoutBlast", () => {
    const chain = board(
      [
        raw("a", { hop: 0, changed: true }),
        raw("b", { hop: 1 }),
        raw("c", { hop: 2 }),
        raw("d", { hop: 2 }),
      ],
      [
        { from: "b", to: "a", kind: "call" },
        { from: "c", to: "b", kind: "call" },
        { from: "d", to: "b", kind: "call" },
      ],
    )

    /* The ring is the information: it must survive the other forces. */
    it("should put each hop on its own ring", () => {
      const placed = new Map(
        layoutBlast(chain.nodes, chain.edges).map((one) => [one.id, radiusOf(one)]),
      )
      expect(placed.get("a") ?? 0).toBeLessThan(RING / 2)
      expect(placed.get("b") ?? 0).toBeGreaterThan(RING * 0.6)
      expect(placed.get("b") ?? 0).toBeLessThan(RING * 1.4)
      expect(placed.get("c") ?? 0).toBeGreaterThan(RING * 1.6)
      expect(placed.get("d") ?? 0).toBeGreaterThan(RING * 1.6)
    })

    /*
     * These positions are written to the document. A layout that depended on
     * anything but its input would make every re-run a diff.
     */
    it("should settle the same board the same way twice", () => {
      expect(layoutBlast(chain.nodes, chain.edges)).toEqual(
        layoutBlast(chain.nodes, chain.edges),
      )
    })

    it("should keep cards from overlapping", () => {
      const placed = layoutBlast(chain.nodes, chain.edges)
      for (const one of placed) {
        for (const two of placed) {
          if (one.id === two.id) continue
          expect(Math.hypot(one.x - two.x, one.y - two.y)).toBeGreaterThan(BLAST_NODE_HEIGHT)
        }
      }
    })

    it("should leave a node the author placed exactly where they put it", () => {
      const withPos = board(
        [raw("a", { hop: 0, changed: true, pos: [42, -17] }), raw("b", { hop: 1 })],
        [{ from: "b", to: "a", kind: "call" }],
      )
      const placed = layoutBlast(withPos.nodes, withPos.edges)
      expect(placed.find((one) => one.id === "a")).toEqual({ id: "a", x: 42, y: -17 })
    })

    it("should return nothing for an empty board", () => {
      expect(layoutBlast([] as BlastNode[], [])).toEqual([])
    })

    /*
     * A ring holds what a ring holds.
     *
     * At a fixed radius a hop's circumference is a hard limit on how many cards
     * fit around it, and collision wins over the radial pull past that: the ring
     * stops being a ring, which is the one thing the radial force protects. The
     * ring has to grow with its population instead.
     */
    describe("a crowded ring", () => {
      const crowded = board(
        [
          raw("a", { hop: 0, changed: true }),
          ...Array.from({ length: 24 }, (_, index) => raw(`n${String(index)}`, { hop: 1 })),
        ],
        Array.from({ length: 24 }, (_, index) => ({
          from: `n${String(index)}`,
          to: "a",
          kind: "call",
        })),
      )

      it("should widen the ring rather than let the cards pile up", () => {
        const placed = layoutBlast(crowded.nodes, crowded.edges)
        const ring = placed.filter((one) => one.id !== "a").map(radiusOf)
        expect(Math.min(...ring)).toBeGreaterThan(RING)
      })

      it("should still keep the cards apart", () => {
        const placed = layoutBlast(crowded.nodes, crowded.edges)
        for (const one of placed) {
          for (const two of placed) {
            if (one.id === two.id) continue
            expect(Math.hypot(one.x - two.x, one.y - two.y)).toBeGreaterThan(
              BLAST_NODE_HEIGHT,
            )
          }
        }
      })

      /* Widening one ring must not put it on top of the next one out. */
      it("should keep a widened ring inside the one beyond it", () => {
        const two = board(
          [
            raw("a", { hop: 0, changed: true }),
            ...Array.from({ length: 24 }, (_, index) => raw(`n${String(index)}`, { hop: 1 })),
            raw("far", { hop: 2 }),
          ],
          [],
        )
        const placed = new Map(layoutBlast(two.nodes, two.edges).map((one) => [one.id, one]))
        const inner = Math.max(
          ...[...placed.values()].filter((one) => one.id.startsWith("n")).map(radiusOf),
        )
        const outer = radiusOf(placed.get("far") as { id: string; x: number; y: number })
        expect(outer).toBeGreaterThan(inner)
      })
    })
  })
})

describe("projectBlast", () => {
  const raw = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    label: id,
    path: `${id}.ts`,
    lines: [1, 5],
    hop: 1,
    ...over,
  })
  const board = (
    nodes: Record<string, unknown>[],
    edges: Record<string, unknown>[] = [],
  ): Blast => {
    const { blast, problems } = checkBlast({
      type: "blast",
      seed: { diff: { base: "a".repeat(40), head: "b".repeat(40) } },
      nodes,
      edges,
    })
    if (blast === null) throw new Error(problems.map((p) => p.message).join("; "))
    return blast
  }

  const twoInOneFile = board(
    [
      raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
      raw("x", { hop: 1, path: "src/pages.tsx" }),
      raw("y", { hop: 1, path: "src/pages.tsx" }),
    ],
    [
      { from: "x", to: "a", kind: "call" },
      { from: "y", to: "a", kind: "call" },
    ],
  )

  it("should draw one card for a folded file, however many declarations it holds", () => {
    const { nodes } = projectBlast(twoInOneFile, new Set(["src/change.ts"]))
    const drawn = nodes.filter((one) => one.kind === "file")
    expect(drawn).toHaveLength(1)
    expect(drawn[0]?.id).toBe("file:src/pages.tsx")
  })

  /* The claim the whole view rests on: folding hides nothing. */
  it("should keep every edge that crossed a folded file's boundary", () => {
    const { edges } = projectBlast(twoInOneFile, new Set(["src/change.ts"]))
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ from: "file:src/pages.tsx", to: "a", crossing: true })
  })

  it("should draw every declaration once a file is open", () => {
    const { nodes, edges } = projectBlast(
      twoInOneFile,
      new Set(["src/change.ts", "src/pages.tsx"]),
    )
    expect(nodes.filter((one) => one.kind === "node")).toHaveLength(3)
    expect(edges).toHaveLength(2)
    expect(edges.every((edge) => !edge.crossing)).toBe(true)
  })

  /* A file using itself is not a fact about the change. */
  it("should not draw a folded file's internal edges as a self-loop", () => {
    const internal = board(
      [
        raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
        raw("x", { hop: 1, path: "src/pages.tsx" }),
        raw("y", { hop: 2, path: "src/pages.tsx" }),
      ],
      [
        { from: "x", to: "a", kind: "call" },
        { from: "y", to: "x", kind: "call" },
      ],
    )
    const { edges } = projectBlast(internal, new Set(["src/change.ts"]))
    expect(edges.every((edge) => edge.from !== edge.to)).toBe(true)
    expect(edges).toHaveLength(1)
  })

  /* Opening a file must spread it around the card, not move the card. */
  it("should put a folded card at the centre of the declarations it stands for", () => {
    const placements = layoutBlast(twoInOneFile.nodes, twoInOneFile.edges)
    const { nodes } = projectBlast(twoInOneFile, new Set(["src/change.ts"]), placements)
    const card = nodes.find((one) => one.kind === "file")
    const members = placements.filter((one) => one.id === "x" || one.id === "y")
    const centreX = members.reduce((sum, one) => sum + one.x, 0) / members.length
    expect(card?.x).toBeCloseTo(centreX, 5)
  })
})

/*
 * The layout builds a folded file's id and the board reads it back, in two
 * files. A prefix spelled differently in one of them fails by never matching,
 * which looks like a click that does nothing rather than like a bug.
 */
describe("fileNodeId and pathOfFileNode", () => {
  const raw = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    label: id,
    path: `${id}.ts`,
    lines: [1, 5],
    hop: 1,
    ...over,
  })
  const board = (
    nodes: Record<string, unknown>[],
    edges: Record<string, unknown>[] = [],
  ): Blast => {
    const { blast, problems } = checkBlast({
      type: "blast",
      seed: { diff: { base: "a".repeat(40), head: "b".repeat(40) } },
      nodes,
      edges,
    })
    if (blast === null) throw new Error(problems.map((p) => p.message).join("; "))
    return blast
  }

  it("should round-trip a path", () => {
    expect(pathOfFileNode(fileNodeId("src/pages/checkout.tsx"))).toBe(
      "src/pages/checkout.tsx",
    )
  })

  it("should round-trip a path containing a colon", () => {
    expect(pathOfFileNode(fileNodeId("odd:name.ts"))).toBe("odd:name.ts")
  })

  it("should refuse a declaration id, which is path:line", () => {
    expect(pathOfFileNode("src/quantity.ts:12")).toBeNull()
  })

  it("should give folded cards the id the reader parses back", () => {
    const blast = board(
      [
        raw("a", { hop: 0, changed: true, path: "src/change.ts" }),
        raw("x", { hop: 1, path: "src/pages.tsx" }),
      ],
      [{ from: "x", to: "a", kind: "call" }],
    )
    const { nodes } = projectBlast(blast, new Set(["src/change.ts"]))
    const folded = nodes.find((one) => one.kind === "file")
    expect(pathOfFileNode(folded?.id ?? "")).toBe("src/pages.tsx")
  })
})
