import {
  blastProblems,
  checkBlast,
  deriveVerdicts,
  parseBlast,
  type BlastEdge,
  type BlastNode,
} from "../blast"

describe("blast", () => {
  const seed = { diff: { base: "a".repeat(40), head: "b".repeat(40) } }

  const node = (over: Record<string, unknown> = {}) => ({
    id: "quantity",
    label: "validateQuantity",
    path: "src/checkout/validations/quantity.ts",
    lines: [2, 6],
    hop: 0,
    changed: true,
    contract: { before: "threw for quantity < 0", now: "throws for quantity <= 0" },
    ...over,
  })

  /** A dependent, which is judged rather than judging. */
  const dep = (over: Record<string, unknown> = {}) => ({
    id: "basket",
    label: "validateBasket",
    path: "src/checkout/validateBasket.ts",
    lines: [4, 9],
    hop: 1,
    changeType: "breaks",
    effect: "lets the throw out",
    ...over,
  })

  const good = {
    type: "blast",
    seed,
    nodes: [node(), dep()],
    edges: [{ from: "basket", to: "quantity", kind: "call" }],
  }

  describe("checkBlast", () => {
    it("should accept a well-formed blast radius", () => {
      const { blast, problems } = checkBlast(good)
      expect(problems).toEqual([])
      expect(blast?.nodes.map((n) => n.id)).toEqual(["quantity", "basket"])
      expect(blast?.edges).toHaveLength(1)
    })

    it("should leave an unassessed node with no verdict at all", () => {
      const { blast } = checkBlast({
        ...good,
        nodes: [node(), dep({ changeType: undefined, effect: undefined })],
      })
      expect(blast?.nodes[1]?.changeType).toBeUndefined()
    })

    it("should normalise a reversed line range", () => {
      const { blast } = checkBlast({ ...good, nodes: [node({ lines: [9, 4] })] })
      expect(blast?.nodes[0]?.lines).toEqual({ from: 4, to: 9 })
    })

    /*
     * A contract states what the change did to a declaration's surface. On a
     * dependent it would describe a surface nobody altered, and the contract it
     * is actually judged against is already written on the node below it.
     */
    it("should refuse a contract on a node the diff did not touch, keeping the node", () => {
      const { blast, problems } = checkBlast({
        ...good,
        nodes: [node(), dep({ contract: { before: null, now: "invented" } })],
      })
      expect(problems[0]?.message).toContain("`contract` and was not changed")
      expect(blast?.nodes.map((n) => n.id)).toEqual(["quantity", "basket"])
      expect(blast?.nodes[1]?.contract).toBeUndefined()
    })

    /*
     * Nothing was done to the change; it is the thing doing. A verdict here
     * would mean "what I do to my callers" while the same field on a dependent
     * means "what was done to me".
     */
    it("should strip a verdict an agent put on the change itself", () => {
      const { blast } = checkBlast({
        ...good,
        nodes: [node({ changeType: "breaks", effect: "mine" })],
        edges: [],
      })
      expect(blast?.nodes[0]?.changeType).toBeUndefined()
      expect(blast?.nodes[0]?.effect).toBeUndefined()
      expect(blast?.nodes[0]?.contract?.now).toBe("throws for quantity <= 0")
    })

    /* Derived from the edges, never accepted from an edit. */
    it("should derive via from the dependencies the change reached", () => {
      const { blast } = checkBlast({
        ...good,
        nodes: [node(), dep({ via: ["invented"] })],
      })
      expect(blast?.nodes[1]?.via).toEqual(["quantity"])
    })

    it("should drop an edge naming a node that does not exist", () => {
      const { blast, problems } = checkBlast({
        ...good,
        edges: [{ from: "basket", to: "ghost", kind: "call" }],
      })
      expect(problems[0]?.message).toContain('names `to` "ghost"')
      expect(blast?.edges).toEqual([])
    })

    it("should drop the second of two nodes sharing an id", () => {
      const { blast, problems } = checkBlast({ ...good, nodes: [node(), node()] })
      expect(problems[0]?.message).toContain("two nodes share the id")
      expect(blast?.nodes).toHaveLength(1)
    })

    /*
     * Calling something you also import is one relationship. Two edges pull the
     * pair twice as hard as their neighbours and the ring buckles.
     */
    it("should collapse a call and a value import between the same pair into one edge", () => {
      const { blast } = checkBlast({
        ...good,
        edges: [
          { from: "basket", to: "quantity", kind: "call" },
          { from: "basket", to: "quantity", kind: "value-import" },
        ],
      })
      expect(blast?.edges).toHaveLength(1)
      expect(blast?.edges[0]?.kind).toBe("call")
    })

    it("should report a board with nothing at its centre", () => {
      const { problems } = checkBlast({
        ...good,
        nodes: [dep()],
        edges: [],
      })
      expect(problems[0]?.message).toContain("no node is marked `changed`")
    })

    it("should refuse a seed that is neither a diff nor a symbol", () => {
      const { blast, problems } = checkBlast({ ...good, seed: { branch: "main" } })
      expect(blast).toBeNull()
      expect(problems).toHaveLength(1)
    })

    it("should refuse a branch name where a full SHA belongs", () => {
      const { blast } = checkBlast({ ...good, seed: { diff: { base: "main", head: "HEAD" } } })
      expect(blast).toBeNull()
    })

    it("should return no blast when every node is malformed", () => {
      const { blast, problems } = checkBlast({ ...good, nodes: [{ id: "x" }] })
      expect(blast).toBeNull()
      expect(problems[problems.length - 1]?.message).toBe("no usable nodes")
    })
  })

  /*
   * The heart of the design. A change reaches hundreds of nodes and an agent
   * cannot write a verdict on every one, so propagation is computed from the
   * stops it authors instead.
   */
  describe("deriveVerdicts", () => {
    const at = (id: string, over: Partial<BlastNode> = {}): BlastNode =>
      ({
        id,
        label: id,
        path: `${id}.ts`,
        lines: { from: 1, to: 2 },
        hop: 1,
        ...over,
      }) as BlastNode

    const uses = (from: string, to: string): BlastEdge => ({ from, to, kind: "call" })

    it("should shield everything a stop stands in front of", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("basket", { changeType: "unaffected", effect: "swallows it" }),
          at("checkout", { hop: 2 }),
          at("receipt", { hop: 2 }),
        ],
        [uses("basket", "quantity"), uses("checkout", "basket"), uses("receipt", "basket")],
      )
      const byId = new Map(verdicts.map((v) => [v.id, v]))
      expect(byId.get("checkout")?.changeType).toBe("unaffected")
      expect(byId.get("checkout")?.shieldedBy).toBe("basket")
      expect(byId.get("receipt")?.shieldedBy).toBe("basket")
    })

    it("should leave a node reachable by a route that misses the stop unshielded", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("basket", { changeType: "unaffected", effect: "swallows it" }),
          at("checkout", { hop: 1 }),
        ],
        // checkout uses the stop *and* the change directly.
        [uses("basket", "quantity"), uses("checkout", "basket"), uses("checkout", "quantity")],
      )
      const checkout = verdicts.find((v) => v.id === "checkout")
      expect(checkout?.changeType).toBeUndefined()
      expect(checkout?.shieldedBy).toBeUndefined()
    })

    it("should propagate past a stop again from an authored affected verdict", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("basket", { changeType: "unaffected", effect: "swallows it" }),
          // The agent looked and found this one does read the swallowed error.
          at("audit", { hop: 2, changeType: "breaks", effect: "reads the error" }),
          at("report", { hop: 3 }),
        ],
        [uses("basket", "quantity"), uses("audit", "basket"), uses("report", "audit")],
      )
      const byId = new Map(verdicts.map((v) => [v.id, v]))
      expect(byId.get("audit")?.changeType).toBe("breaks")
      expect(byId.get("report")?.changeType).toBeUndefined()
    })

    it("should never overwrite an authored verdict", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("basket", { changeType: "unaffected", effect: "swallows it" }),
          at("odd", { hop: 2, changeType: "behaviour-changes", effect: "special" }),
        ],
        [uses("basket", "quantity"), uses("odd", "basket")],
      )
      const odd = verdicts.find((v) => v.id === "odd")
      expect(odd?.changeType).toBe("behaviour-changes")
      expect(odd?.shieldedBy).toBeUndefined()
    })

    it("should name the nearest stop when two shield the same node", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("near", { hop: 1, changeType: "unaffected", effect: "a" }),
          at("far", { hop: 1, changeType: "unaffected", effect: "b" }),
          at("top", { hop: 2 }),
        ],
        [uses("near", "quantity"), uses("far", "near"), uses("top", "far")],
      )
      expect(verdicts.find((v) => v.id === "top")?.shieldedBy).toBe("far")
    })

    it("should strip an shieldedBy an agent wrote on an authored node", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", {
            hop: 0,
            changed: true,
            changeType: "breaks",
            contract: { before: "b", now: "n" },
            shieldedBy: "invented",
          }),
        ],
        [],
      )
      expect(verdicts[0]?.shieldedBy).toBeUndefined()
    })

    it("should terminate on a cycle", () => {
      const verdicts = deriveVerdicts(
        [
          at("quantity", { hop: 0, changed: true, contract: { before: "b", now: "n" } }),
          at("a", { hop: 1 }),
          at("b", { hop: 2 }),
        ],
        [uses("a", "quantity"), uses("b", "a"), uses("a", "b")],
      )
      expect(verdicts).toHaveLength(3)
    })
  })

  describe("blastProblems", () => {
    const check = (value: unknown) => {
      const { blast } = checkBlast(value)
      if (blast === null) throw new Error("expected a blast")
      return blastProblems(blast).map((p) => p.message)
    }

    it("should pass a fully assessed board", () => {
      expect(check(good)).toEqual([])
    })

    it("should refuse a reachable node nobody assessed", () => {
      const messages = check({
        ...good,
        nodes: [node(), dep({ changeType: undefined, effect: undefined })],
      })
      expect(messages[0]).toContain("reachable from the change and unassessed")
    })

    it("should accept a node left unassessed only because a stop shields it", () => {
      expect(
        check({
          ...good,
          nodes: [
            node(),
            dep({ changeType: "unaffected", effect: "swallows it" }),
            dep({ id: "checkout", hop: 2, changeType: undefined, effect: undefined }),
          ],
          edges: [
            { from: "basket", to: "quantity", kind: "call" },
            { from: "checkout", to: "basket", kind: "call" },
          ],
        }),
      ).toEqual([])
    })

    it("should refuse an unproven use nobody answered", () => {
      const messages = check({
        ...good,
        nodes: [
          node(),
          dep({
            id: "dispatch",
            label: "handlers[kind]()",
            changeType: undefined,
            effect: undefined,
            unproven: { path: "src/api/router.ts", line: 40 },
          }),
        ],
        edges: [{ from: "dispatch", to: "quantity", kind: "call" }],
      })
      expect(messages.some((m) => m.includes("is an unproven use at src/api/router.ts:40"))).toBe(true)
    })

    it("should accept an unproven use the agent recorded as runtime", () => {
      const messages = check({
        ...good,
        nodes: [
          node(),
          dep({
            id: "dispatch",
            label: "handlers[kind]()",
            changeType: "behaviour-changes",
            effect: "every handler takes the new bound",
            unproven: { path: "src/api/router.ts", line: 40, runtime: "chosen from config" },
          }),
        ],
        edges: [{ from: "dispatch", to: "quantity", kind: "call" }],
      })
      expect(messages).toEqual([])
    })

    /*
     * The declaration's own name is the right label on a reach graph. Its own
     * name is what a reviewer wants to see; renaming it into prose would make
     * the board worse. The meaning lives in
     * `effect`, which is gated.
     */
    it("should not ask for a label, unlike the code diagram", () => {
      expect(check({ ...good, nodes: [node({ draft: true })], edges: [] })).toEqual([])
    })

    it("should refuse an assessed node that says nothing about the effect", () => {
      const messages = check({
        ...good,
        nodes: [node(), dep({ effect: undefined })],
      })
      expect(messages.some((m) => m.includes("with nothing said about it"))).toBe(true)
    })

    it("should refuse a changed node that does not state its surface", () => {
      const messages = check({
        ...good,
        nodes: [node({ contract: undefined })],
        edges: [],
      })
      expect(messages.some((m) => m.includes("does not say what its surface is now"))).toBe(true)
    })

    /*
     * A symbol seed has no base SHA, so there is no pre-image to hand over and a
     * recalled one would be the kind of assertion this format exists to prevent.
     */
    it("should not ask a symbol-seeded board what a node did before", () => {
      const messages = check({
        ...good,
        seed: {
          symbol: {
            path: "src/checkout/validations/quantity.ts",
            name: "validateQuantity",
            hypothesis: "raise the bound to 20",
          },
        },
        nodes: [node()],
        edges: [],
      })
      expect(messages).toEqual([])
    })
  })

  describe("parseBlast", () => {
    it("should report a fence that is not JSON", () => {
      const { blast, problems } = parseBlast("{ nope")
      expect(blast).toBeNull()
      expect(problems[0]?.message).toContain("not valid JSON")
    })

    it("should parse a fence body", () => {
      expect(parseBlast(JSON.stringify(good)).blast?.nodes).toHaveLength(2)
    })
  })
})

/**
 * Parsing has to survive being done twice.
 *
 * Every verdict written through `update-nodes` parses the stored board, edits
 * it, and stores the parsed result — so this schema's output is its own input
 * on the next call. When it was not idempotent the failure was total: `lines`
 * came back as an object, every node was refused, every node was dropped, and
 * every edge then named endpoints that no longer existed. A 41-node board
 * became "no usable nodes" and the document could not be completed.
 */
describe("checkBlast is idempotent", () => {
  const authored = {
    type: "blast",
    seed: { diff: { base: "a".repeat(40), head: "b".repeat(40) } },
    nodes: [
      {
        id: "src/a.ts:1",
        label: "alpha",
        path: "src/a.ts",
        lines: [1, 3],
        hop: 0,
        changed: true,
        contract: { before: "p", now: "n" },
      },
      {
        id: "src/b.ts:4",
        label: "beta",
        path: "src/b.ts",
        lines: [9, 4],
        hop: 1,
        changeType: "unaffected",
        effect: "swallows it",
      },
    ],
    edges: [{ from: "src/b.ts:4", to: "src/a.ts:1", kind: "call", at: 5 }],
  }

  it("should accept its own output, keeping every node and edge", () => {
    const first = checkBlast(authored)
    expect(first.problems).toEqual([])
    expect(first.blast?.nodes).toHaveLength(2)

    const second = checkBlast(first.blast)
    expect(second.problems).toEqual([])
    expect(second.blast?.nodes).toHaveLength(2)
    expect(second.blast?.edges).toHaveLength(1)
  })

  it("should settle after one parse, so a third is identical to a second", () => {
    const once = checkBlast(authored).blast
    const twice = checkBlast(once).blast
    const thrice = checkBlast(twice).blast
    expect(thrice).toEqual(twice)
  })

  it("should read a range back as an object and keep it normalised", () => {
    const once = checkBlast(authored).blast
    expect(once?.nodes[1]?.lines).toEqual({ from: 4, to: 9 })
    expect(checkBlast(once).blast?.nodes[1]?.lines).toEqual({ from: 4, to: 9 })
  })

  it("should still refuse a range that is neither a pair nor a from/to object", () => {
    const { blast } = checkBlast({
      ...authored,
      nodes: [{ ...authored.nodes[0], lines: { start: 1, end: 3 } }],
    })
    expect(blast).toBeNull()
  })
})
