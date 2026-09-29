import { z } from "zod"

/**
 * The diagram IR.
 *
 * Typed JSON rather than a diagram language, and one schema per diagram type
 * rather than one universal node. That second decision is the important one: a
 * sequence diagram has participants and messages, not nodes, and a single node
 * concept stretched across every kind of diagram is what makes such formats
 * unpleasant to write and worse to render. Only the `code` type exists so far,
 * named so others can be added beside it rather than folded into it.
 *
 * `code` rather than an infrastructure vocabulary, because a pull request is a
 * change to *code*: a reviewer wants to see where data enters, where it is
 * checked and where it is stored, at the granularity of functions.
 *
 * Shape is checked with Zod; relationships are checked by hand below. Zod is
 * good at "this field is one of these eight strings" and poor at "this edge
 * names a node declared elsewhere in the same array", so each does the half it
 * suits.
 */

/**
 * What a node is, as a *visual* category.
 *
 * Six values, chosen by one test: would a reviewer scanning the board want
 * this distinguished at a glance? They pick a colour and a word and nothing
 * else. Keeping them visual rather than semantic is why an agent gets them
 * right; a taxonomy of meaning is something it would argue with.
 *
 * `entry` was one of these once, and it never belonged. Every other value here
 * names code that *runs*, and every node carries a reference to the lines that
 * run it. What starts a trace has no such lines — a customer pressing a button
 * is not in the repository — so an author naming the trigger was pushed into
 * pointing the node at whatever code sat nearest, usually the handler that the
 * next node along already was. Entry points are no longer part of a diagram.
 */
export const CODE_NODE_TYPES = [
  /** Validator, gate, permission or schema check. Code whose job is to refuse. */
  "guard",
  /** A function or method that transforms. The default. */
  "logic",
  /** Query, repository, migration, cache access. */
  "data",
  /** Interface, type alias, schema, enum. Shape rather than behaviour. */
  "type",
  /** Component, view, template. */
  "ui",
  /** Constant, flag, environment or build setting. */
  "config",
] as const

export const EDGE_VARIANTS = ["default", "emphasis", "security", "dashed"] as const

/** An inclusive range of file lines, given as a pair and normalised. */
const range = z
  .tuple([z.number().int().positive(), z.number().int().positive()])
  .transform(([a, b]) => ({ from: Math.min(a, b), to: Math.max(a, b) }))

/**
 * Where a node's code lives.
 *
 * A reference, never a paste, exactly like a waypoint's code. That buys the
 * anchor repair, the validator's range checks, the permalink to the diff, and
 * the diff marks already computed for the code panel — none of which a pasted
 * snippet could have.
 */
const source = z.object({
  path: z.string().min(1),
  lines: range.optional(),
  /** Text expected on the range's first line, so the range can repair itself. */
  anchor: z.string().min(1).optional(),
})

/**
 * An edge written on the node it leaves.
 *
 * No `source`: it is the node that carries it. An author who has just written a
 * card knows what it calls next, and making them repeat both ids in a separate
 * list at the bottom of the fence is how an edge ends up naming a node that was
 * renamed an hour ago.
 */
const nodeEdgeSchema = z.object({
  target: z.string().min(1),
  label: z.string().optional(),
  variant: z.enum(EDGE_VARIANTS).optional(),
  /**
   * A value *handoff* rather than a plain call: the function reached the target
   * as a value (a hook, a JSX prop, a collection, a return) and is invoked
   * there. Drawn distinctly from a call so a reviewer can tell "this is called
   * here" from "this was handed off and fired here". See {@link EdgeKind}.
   */
  handoff: z.boolean().optional(),
})

const cardSchema = z.object({
  id: z.string().min(1),
  type: z.enum(CODE_NODE_TYPES),
  label: z.string().min(1),
  /** Secondary line on the card: the identifier the label leaves out. */
  sublabel: z.string().optional(),
  /**
   * Set while the label is still the scaffold's, which is the declaration name.
   *
   * The flag was retired once and is back, because retiring it rested on a
   * claim the instructions never agreed with: that a real declaration name is a
   * good enough label. It is not — a label says what the code *does*, and the
   * identifier belongs in `sublabel` — so a scaffolded label is a placeholder
   * like any other and the worklist has to be able to ask for a real one.
   * Cleared by whatever writes the label.
   */
  draft: z.literal(true).optional(),
  /**
   * Whether this node is part of the change, or context around it.
   *
   * A diagram is a call stack, which means most of its nodes are code the
   * change never touches — the click that starts it, the two functions in
   * between. Without this the reviewer cannot tell which card is the point,
   * and a map where everything looks equally important is a map of nothing.
   *
   * Default false, so an author has to say which nodes are theirs rather than
   * having every context node claim to be a change.
   */
  changed: z.boolean().optional(),
  /** Markdown shown in the hover card. */
  description: z.string().optional(),
  // Not capped here. Three is the limit, but a fourth reference should cost the
  // author a warning and the fourth source, not the whole node: Zod's `.max`
  // would reject the node entirely and the board would lose a card over it.
  sources: z.array(source).optional(),
  /**
   * An escape marker rather than a real declaration: the point where the value
   * left static resolution (a spread, a store, an event bus, a computed
   * dispatch, an HOC, an un-indexed library). It carries no runnable code; the
   * label says where the reach may continue and cannot be proven. This is the
   * revived unproven/unresolved signal.
   */
  escape: z.boolean().optional(),
})

/**
 * A card, plus the two fields that make the array a tree.
 *
 * `children` are the nodes that run **after** this one, and siblings inside it
 * are alternative paths: a sequence is a chain of single children, an `if`/`else`
 * is two. That is the whole grammar, and it is the one an author already holds
 * in their head after reading the function.
 *
 * The tree is flattened away here. Everything downstream — the layout, the
 * board, the validator, the code panels — sees the flat `nodes` and `edges` it
 * always saw, which is why nesting could be added without touching any of them.
 */
const nodeSchema = cardSchema.extend({
  edges: z.array(nodeEdgeSchema).optional(),
  // Walked by hand rather than declared recursively with `z.lazy`, so one
  // malformed grandchild costs one card instead of the whole branch.
  children: z.array(z.unknown()).optional(),
})

/**
 * Which of the two relationships an edge is, which is also which way it points.
 *
 * Set here rather than worked out from the geometry later, because the geometry
 * is decided *by* this: a `child` edge puts the node below its parent and is
 * drawn downwards, a `call` edge puts it in the next column across and is drawn
 * sideways. The distinction is lost the moment the tree is flattened, so it is
 * carried on the edge.
 *
 * A `value` edge lays out like a `call` (across, into the next column) but is
 * drawn distinctly: it is a *handoff*, where the function travelled as a value
 * and was invoked at the far end, rather than called by name.
 */
export type EdgeKind = "child" | "call" | "value"

const diagramSchema = z.object({
  type: z.literal("code"),
  title: z.string().optional(),
  nodes: z.array(z.unknown()),
})

export type CodeNodeType = (typeof CODE_NODE_TYPES)[number]
export type EdgeVariant = (typeof EDGE_VARIANTS)[number]
export type SourceRange = { from: number; to: number }
export type NodeSource = z.output<typeof source>
export type DiagramNode = z.output<typeof cardSchema>
export type DiagramEdge = z.output<typeof nodeEdgeSchema> & {
  source: string
  kind: EdgeKind
}
export type Diagram = {
  type: "code"
  title?: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export type DiagramProblem = { message: string }

/** The first useful line of a Zod failure, prefixed with where it happened. */
function describe(where: string, error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue === undefined) return `${where} is not valid`
  const at = issue.path.length === 0 ? "" : ` at \`${issue.path.join(".")}\``
  return `${where}${at}: ${issue.message}`
}

/**
 * Checks a diagram.
 *
 * Nodes are parsed **one at a time**, deliberately. A whole-array parse would
 * reject the document for one malformed node, and a board missing one card is
 * far more useful than no board and an error. Edges are the same.
 *
 * This is also where the tree becomes a graph. `nodes` is a forest: a node's
 * `children` are the nodes that run after it, and the edge into each of them is
 * the nesting itself, so a sequence of four steps costs four objects and no
 * edges at all. An edge written by hand between the same two nodes replaces the
 * implied one, which is how a fork gets "no stock" on one arm.
 *
 * The relational checks are the ones a schema cannot express and the ones that
 * actually go wrong: an edge naming a node that does not exist, two nodes
 * sharing an id, a node nothing connects to. This is the one place in the
 * project where structural validation genuinely earns its keep, because prose
 * cannot fail this way and code references fail against the repository instead.
 */
export function checkDiagram(value: unknown): {
  diagram: Diagram | null
  problems: DiagramProblem[]
} {
  const outer = diagramSchema.safeParse(value)
  if (!outer.success) {
    return { diagram: null, problems: [{ message: describe("diagram", outer.error) }] }
  }

  const problems: DiagramProblem[] = []
  const nodes: DiagramNode[] = []
  const ids = new Set<string>()
  const written: DiagramEdge[] = []
  const implied: DiagramEdge[] = []
  /** Each node's own children, so a written edge to one can be recognised. */
  const kids = new Map<string, Set<string>>()

  /** A child's id before it is parsed, which is all the check below needs. */
  const idOf = (entry: unknown): string => {
    const id = (entry as { id?: unknown } | null)?.id
    return typeof id === "string" ? id : ""
  }

  /*
   * Depth first, so a card is followed by the steps inside it.
   *
   * The order is the reading order and it survives into the flat array, which
   * matters twice over: the board's code panels are indexed by it, and a
   * problem about "the third node" should mean the third one an author can see.
   */
  const walk = (entry: unknown, parent: string | null, where: string): void => {
    const parsed = nodeSchema.safeParse(entry)
    if (!parsed.success) {
      const id = (entry as { id?: unknown } | null)?.id
      const named = typeof id === "string" ? `node "${id}"` : where
      /*
       * The one failure worth a sentence of its own.
       *
       * `entry` was a node type until entry points got their own array, so a
       * document written against the old shape fails here — on the enum, with
       * a message listing the surviving type names and no hint that `entry` moved
       * rather than vanished. An author reading that picks the nearest
       * surviving type, which is how a trigger becomes a `logic` node pointing
       * at the handler below it.
       */
      if ((entry as { type?: unknown } | null)?.type === "entry") {
        problems.push({
          message: `${named} is \`"type": "entry"\`, which is no longer a node type. An entry point describes what starts the trace rather than code that runs, so it moves to the top-level \`entries\` array as \`{ "id", "trigger", "label", "into" }\` and drops its \`sources\`.`,
        })
        return
      }
      /*
       * The other retired type, and the message matters as much as the refusal.
       *
       * An author who reads "must be one of guard, logic, …" relabels the test
       * card `logic` and leaves it on the board, which is worse than the
       * original: the suite is still drawn, and now it claims to be production
       * code. The reason has to travel with the error.
       */
      if ((entry as { type?: unknown } | null)?.type === "test") {
        problems.push({
          message: `${named} is \`"type": "test"\`, which is no longer a node type. A diagram is the call stack a change sits on, and a test is not on it — nothing in the running system calls the suite — so relabelling the card leaves the same problem. Take it off the board; a test belongs in the Implementation Overview and in a waypoint of its own.`,
        })
        return
      }
      problems.push({ message: describe(named, parsed.error) })
      return
    }
    const { edges: own, children, ...card } = parsed.data
    if (ids.has(card.id)) {
      problems.push({ message: `two nodes share the id "${card.id}"` })
      return
    }
    ids.add(card.id)

    // More references than that is a diagram pretending to be a node, and the
    // hover card has nowhere to put them.
    if ((card.sources?.length ?? 0) > 3) {
      problems.push({
        message: `node "${card.id}" has more than three sources; the rest are ignored`,
      })
      nodes.push({ ...card, sources: card.sources?.slice(0, 3) })
    } else {
      nodes.push(card)
    }

    // The edge into a child is the nesting itself. Written plain, and given a
    // label later if the author wrote one for the same pair.
    if (parent !== null) implied.push({ source: parent, target: card.id, kind: "child" })
    for (const edge of own ?? []) {
      const { handoff, ...rest } = edge
      written.push({ source: card.id, ...rest, kind: handoff === true ? "value" : "call" })
    }
    kids.set(card.id, new Set((children ?? []).map((child) => idOf(child))))
    for (const [index, child] of (children ?? []).entries()) {
      walk(child, card.id, `child ${String(index + 1)} of "${card.id}"`)
    }
  }

  for (const [index, entry] of outer.data.nodes.entries()) {
    walk(entry, null, `node ${String(index + 1)}`)
  }

  /*
   * A written edge to the node's own child only decorates the nesting.
   *
   * Otherwise labelling one arm of a branch would move it: a `call` is drawn
   * across to the next column and a `child` down to the next row, so the label
   * an author added to say "out of stock" would have taken that arm out of the
   * fork it belongs to.
   */
  const edges: DiagramEdge[] = []
  const explicit = new Set(written.map((edge) => `${edge.source}->${edge.target}`))
  const all = [
    ...implied.filter((edge) => !explicit.has(`${edge.source}->${edge.target}`)),
    ...written.map((edge) =>
      kids.get(edge.source)?.has(edge.target) === true
        ? { ...edge, kind: "child" as const }
        : edge,
    ),
  ]
  for (const edge of all) {
    const { source: from, target: to } = edge
    // The commonest structural mistake, and unrenderable: an edge to nowhere.
    if (!ids.has(from)) {
      problems.push({ message: `edge names source "${from}", which is not a node` })
      continue
    }
    if (!ids.has(to)) {
      problems.push({ message: `edge names target "${to}", which is not a node` })
      continue
    }
    edges.push(edge)
  }

  if (nodes.length === 0) {
    return { diagram: null, problems: [...problems, { message: "no usable nodes" }] }
  }

  // An orphan is legal in a diagram with no edges — one node is a diagram — but
  // in a connected one it is almost always a typo in an id.
  if (edges.length > 0) {
    const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]))
    for (const node of nodes) {
      if (!connected.has(node.id)) {
        problems.push({ message: `node "${node.id}" has no edges` })
      }
    }
  }

  return {
    diagram: { type: "code", title: outer.data.title, nodes, edges },
    problems,
  }
}

/** Parses a ```diagram fence body. */
export function parseDiagram(body: string): {
  diagram: Diagram | null
  problems: DiagramProblem[]
} {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch (cause) {
    return {
      diagram: null,
      problems: [
        {
          message: `not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
        },
      ],
    }
  }
  return checkDiagram(value)
}
