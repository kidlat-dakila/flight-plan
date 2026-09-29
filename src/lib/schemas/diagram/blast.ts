import { z } from "zod"

/**
 * The blast radius IR.
 *
 * A second diagram type, beside `code` and deliberately not a variant of it.
 * `schema.ts` opens by saying one schema per diagram type rather than one
 * universal node, and this is the case that was being anticipated: a code node
 * carries a visual category and a position in an execution order, a blast node
 * carries a hop count and a verdict, and neither has any use for the other's
 * fields.
 *
 * The two answer different questions about the same change. A code diagram is a
 * *trace*: one path, nested by execution order, ending at the roots it found. A
 * blast radius is *reach*: every path, nested by nothing, ending when nothing
 * else uses the code. Diamonds are ordinary here and cycles are legal, so the
 * tree the code diagram uses cannot express it.
 *
 * Shape is checked with Zod and relationships by hand, for the reason the code
 * diagram gives: Zod is good at "this field is one of these four strings" and
 * poor at "this edge names a node declared elsewhere in the same array".
 */

/**
 * What the change does to a node.
 *
 * Three values, and no `unknown`. A node nobody has assessed simply has no
 * `changeType`, which says the same thing without dressing an absence as one of
 * the answers — and the gate in `blastProblems` still tells it apart from a
 * considered `unaffected`, because absent and "unaffected" are different states.
 *
 * There is no `unknown`. An unassessed node simply has no `changeType`, which
 * is the same statement without dressing an absence as one of the answers.
 *
 * `behaviour-changes` sits between the other two because most real impact is
 * there. A caller that still compiles, still runs, and now rejects a basket
 * of fifteen it used to accept is neither broken nor unaffected, and
 * collapsing it into either is how a review misses the actual consequence.
 */
export const CHANGE_TYPES = [
  /** The node cannot work against the changed code: a type error, a throw it does not catch, a contract it violates. */
  "breaks",
  /** The node still works and does something different. */
  "behaviour-changes",
  /** The change cannot reach this node, or reaches it and changes nothing. */
  "unaffected",
] as const

/**
 * How one declaration reaches another.
 *
 * The code diagram draws calls only, because it draws execution and an import
 * does not run. Reach is a different relation and needs the wider set: a file
 * that imports `validateQuantity` and hands it to something else is downstream of it
 * whether or not a call expression appears anywhere in that file.
 *
 * `re-export` is kept apart from `value-import` because it is the edge that
 * decides whether this feature works on a real repository.
 */
export const BLAST_EDGE_KINDS = ["call", "value-import", "re-export"] as const

/** A full commit SHA. Duplicated rather than imported: `diagram/` has no other dependency than Zod, and a leaf is worth keeping. */
const sha = z
  .string()
  .regex(/^[0-9a-f]{40}$/, "must be a full 40-character commit SHA, not a branch name")

/**
 * An inclusive range of file lines, written as a pair and read back either way.
 *
 * **Both forms are accepted, and that is load-bearing rather than tidy.** A
 * blast radius is unlike the code diagram in one decisive respect: it is
 * re-parsed. Every verdict written through `update-nodes` parses the stored
 * board, edits it, and stores the *parsed* result — so the output of this
 * schema becomes the input to it on the very next call. A tuple-only shape is
 * therefore not idempotent, and the failure is total rather than partial: every
 * node is refused at `lines`, every node is dropped, and every edge then names
 * endpoints that no longer exist. One field disagreeing with itself takes the
 * whole board down.
 *
 * The code diagram's own `range` is tuple-only and correct to be, because a
 * diagram is stored in the form its author wrote and parsed once, on the way to
 * being drawn. Nothing writes a parsed diagram back.
 *
 * Duplicated from `document/primitives.ts`, whose `lineRange` is the same union
 * for the same reason, rather than imported: `diagram/` depends on nothing but
 * Zod and a leaf is worth keeping. The comment there is the canonical
 * explanation.
 */
const line = z.number().int().positive()
const range = z
  .union([
    z.tuple([line, line]).transform(([a, b]) => ({ from: a, to: b })),
    z.object({ from: line, to: line }).strict(),
  ])
  .transform(({ from, to }) => ({ from: Math.min(from, to), to: Math.max(from, to) }))

const pair = z.tuple([z.number(), z.number()])

/**
 * A use the resolver found and could not prove.
 *
 * A call site names the declaration, the file imports its module, and the
 * binding still will not resolve: a computed specifier, a dispatch table, a
 * value member call such as `order.total()`. That is a dependent which may
 * exist and cannot be demonstrated.
 *
 * It is a **node** rather than a number in a note, and that is the difference
 * between this and the code diagram's handling of the same situation. A missing
 * edge in a trace makes the trace start too deep, which a reader can see. A
 * missing edge in a reach graph makes a whole subtree invisible, and nobody can
 * see an absence. So it is drawn, and it blocks completion until
 * somebody answers it.
 */
const unprovenSchema = z
  .object({
    /** The file the unprovable use is in. */
    path: z.string().min(1),
    /** The line it is on, so the agent has somewhere to start. */
    line: z.number().int().positive(),
    /**
     * What the resolver narrowed it to.
     *
     * A lead, never a menu. The agent is not confined to this list and must not
     * treat it as exhaustive: the whole reason it is being asked is that it can
     * look further than a parser can.
     */
    candidates: z
      .array(z.object({ path: z.string().min(1), name: z.string().min(1) }).strict())
      .optional(),
    /**
     * Why the resolver could not decide.
     *
     * Carried because it tells the agent where to look, and the five cases send
     * it to five different places: a computed specifier means read the
     * directory, a member call on a value means find what types the receiver, a
     * missing export means the module genuinely does not have it. A bare "could
     * not resolve" would make every one of them the same search.
     */
    reason: z
      .enum([
        "no-binding",
        "computed-specifier",
        "member-on-value",
        "no-export",
        "unreadable-module",
        // Value-flow escape kinds: the function was followed as a value up to a
        // boundary the trace cannot cross. Each says where the reach may
        // continue and could not be proven. (See codegraph `EscapeKind`.)
        "spread",
        "props",
        "store",
        "event-bus",
        "dynamic-dispatch",
        "hoc",
        "library",
        "decorator",
        "import",
      ])
      .optional(),
    /** Set when the agent answered that the target cannot be known statically. */
    runtime: z.string().min(1).optional(),
  })
  .strict()

/**
 * A declaration the change reaches, or might.
 *
 * Not `strict`, matching the code diagram's node: an unknown field on one card
 * should cost a warning rather than the card.
 */
const blastNodeSchema = z.object({
  id: z.string().min(1),
  /** The declaration's name, or the call expression as written for an unproven node. */
  label: z.string().min(1),
  /**
   * Set while the label is still the one the walk read off the declaration.
   *
   * **Not gated, unlike the code diagram's**, and the difference is the point.
   * A diagram node labelled `validateQuantity` tells a reviewer what they could have
   * read in the file, so it has to become what the step *does*. A blast node is
   * identified by *which declaration it is*, and renaming a declaration into
   * prose would make the board worse rather than better. What the change means
   * for the node lives in
   * `effect`, which completion does require.
   *
   * Kept as a mark rather than dropped, so the view can tell an authored label
   * from the declaration's own and a reader can see which is which.
   */
  draft: z.literal(true).optional(),
  /**
   * The file it is declared in, which is also its cluster.
   *
   * A file is never a node. Grouping is derived from this field and never
   * authored, because giving a file an id would make it a possible edge target,
   * and an edge would then be able to point at something that does not run.
   */
  path: z.string().min(1),
  lines: range,
  /** Text expected on the range's first line, so the range can repair itself. */
  anchor: z.string().min(1).optional(),
  /**
   * Hops from the nearest changed declaration. Zero is the change itself.
   *
   * The **minimum** over every path that reaches it. A declaration two hops away
   * by one route and five by another is two hops away: the shortest path is how
   * close the change actually is, and the ring it is drawn on says so.
   */
  hop: z.number().int().min(0),
  /** Whether the diff touched this declaration. */
  changed: z.boolean().optional(),
  /** Set when this node stands for a use nobody could prove. */
  unproven: unprovenSchema.optional(),
  /**
   * What the change does to this node. Absent on the change itself.
   *
   * A changed declaration has no verdict, and that is not an omission. Nothing
   * was done to it; it is the thing doing. Its outgoing effect is its
   * `contract`, and a verdict here would mean "what I do to my callers" while
   * the same field on a dependent means "what was done to me" — one name, two
   * directions, which is what produced changelog prose on the seeds.
   */
  changeType: z.enum(CHANGE_TYPES).optional(),
  /**
   * What the change does to this node, in one line.
   *
   * Only on a dependent, and measured against the `contract` of whatever it
   * uses. Because the contract carries the general fact, this stays a short
   * consequence: "omits `held`, so the new field never reaches it" rather
   * than a restatement of what changed below.
   *
   * Required alongside an authored verdict. The verdict is the finding and this
   * is the evidence for it.
   *
   * **Markdown, and `code:` links belong in it.** The call site that does or does
   * not carry the change is the most useful thing to link, and a link makes the
   * claim checkable rather than merely asserted.
   */
  effect: z.string().optional(),
  /**
   * What anyone using this declaration has to know, before and after.
   *
   * Only on a node the diff touched, and refused elsewhere. This is the source
   * of the blast: every dependent's verdict is a consequence of it, so it is
   * written once here rather than restated by each of them.
   *
   * **Its surface, not its insides.** "Counts held units as taken in the stock check"
   * describes what changed inside a function and tells a caller nothing. "Takes
   * an optional `held` on each line; callers that omit it see no change" is
   * the same change stated so that every caller can be judged against it without
   * opening the file.
   *
   * `before` is null for something that did not exist. That is a fact the diff
   * already carries, and prose saying "new file" on every added declaration is
   * the walk's own knowledge typed back in by hand.
   *
   * **Markdown, and `code:` links belong in it.** A contract names types, fields
   * and declarations, and naming one with a link rather than in prose is what
   * lets a reader go and look instead of taking the sentence's word for it.
   * Every link is checked against the repository at write time, so one that
   * resolves is a claim the repository has agreed to.
   */
  contract: z
    .object({ before: z.string().nullable(), now: z.string().min(1) })
    .strict()
    .optional(),
  /**
   * The stop that keeps the change from reaching this node.
   *
   * Derived by `deriveVerdicts`, never written by an agent. That is what stops a
   * stop's coverage from being something anybody can assert: it is computed
   * from the graph, so it is as true as the edges are.
   */
  shieldedBy: z.string().min(1).optional(),
  /**
   * The dependencies this node's verdict was formed against.
   *
   * Derived, not authored. It is exactly this node's outgoing edges to things
   * the change reached, and the walk holds every edge — so asking an agent for
   * it would be asking it to restate the graph, which is the one thing the
   * machine owns outright.
   */
  via: z.array(z.string().min(1)).optional(),
  /** Secondary line on the card, usually the file or the signature. */
  sublabel: z.string().optional(),
  /** Short classification, drawn as a chip. */
  tag: z.string().optional(),
  /** Markdown shown in the hover card. */
  description: z.string().optional(),
  /** Where the simulation settled it, so reopening gives the same board. */
  pos: pair.optional(),
})

/**
 * One declaration using another.
 *
 * In its own array rather than on the node, which is the opposite of the code
 * diagram and for a reason that does not carry over. There, an author writes
 * every edge by hand, and making them repeat both ids in a list at the bottom
 * of the fence is how an edge ends up naming a node renamed an hour ago. Here
 * the walk writes every edge and nobody types one, so that cost is not paid —
 * and a graph with diamonds needs a real edge list to express them at all.
 *
 * `from` is the dependent and `to` is what it uses, so an edge points *inward*,
 * toward the change. That is the direction of the question the board answers.
 */
const blastEdgeSchema = z
  .object({
    /** The dependent: the declaration doing the using. */
    from: z.string().min(1),
    /** What it uses. */
    to: z.string().min(1),
    kind: z.enum(BLAST_EDGE_KINDS),
    /** The line in `from`'s file where the use is. */
    at: z.number().int().positive().optional(),
    label: z.string().optional(),
  })
  .strict()

/**
 * What the walk started from.
 *
 * Two arms, and the second is weaker than anything else in this format. A diff
 * seed measures; a symbol seed assesses a change that has not been written, so
 * its verdicts rest on `hypothesis` rather than on code. It is here because the
 * pre-change question is the one most worth asking, and the hypothesis is stored
 * so the panel can say on its face what the verdicts are resting on.
 */
const blastSeedSchema = z.union([
  z.object({ diff: z.object({ base: sha, head: sha }).strict() }).strict(),
  z
    .object({
      symbol: z
        .object({
          path: z.string().min(1),
          name: z.string().min(1),
          /** What the author intends to change. The verdicts assess this, not a diff. */
          hypothesis: z.string().min(1),
        })
        .strict(),
    })
    .strict(),
])

const blastSchema = z.object({
  type: z.literal("blast"),
  title: z.string().optional(),
  seed: blastSeedSchema,
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()).optional(),
  /** One line per thing the walk could not read, for the panel to pass on. */
  notes: z.array(z.string()).optional(),
})

export type ChangeType = (typeof CHANGE_TYPES)[number]
export type BlastEdgeKind = (typeof BLAST_EDGE_KINDS)[number]
export type Unproven = z.output<typeof unprovenSchema>
export type BlastNode = z.output<typeof blastNodeSchema>
export type BlastEdge = z.output<typeof blastEdgeSchema>
export type BlastSeed = z.output<typeof blastSeedSchema>
export type Blast = {
  type: "blast"
  title?: string
  seed: BlastSeed
  nodes: BlastNode[]
  edges: BlastEdge[]
  notes: string[]
}

export type BlastProblem = { message: string }

/** A verdict an agent wrote, as opposed to one the graph produced. */
export const isAuthored = (node: BlastNode): boolean =>
  node.shieldedBy === undefined && node.changeType !== undefined

/** A node an agent has said the change cannot get past. */
export const isStop = (node: BlastNode): boolean =>
  isAuthored(node) && node.changeType === "unaffected"

/**
 * Which nodes the change can actually get to, and which are shielded.
 *
 * The heart of the design, and the thing that makes an unbounded graph
 * assessable. A change to a widely used declaration reaches hundreds of nodes,
 * and an agent writing a verdict on every one of them does not finish — which
 * matters more than it sounds, because a gate that can never pass is a gate
 * somebody switches off.
 *
 * Most of those hundreds are unaffected for **one** reason: the change stops
 * propagating somewhere. A function that catches the throw and returns on a
 * different field entirely shields everything above it, and that fact is a
 * property of that function, not of its four hundred callers.
 *
 * So propagation is computed rather than asserted:
 *
 * - **Sources** are the changed declarations, plus any node an agent has
 *   authored as affected. The second half is what lets an authored verdict
 *   override an inherited one and have the override *propagate*.
 * - **Stops** are nodes authored `unaffected`. They are reached, and propagation
 *   does not continue through them.
 * - Anything the walk cannot arrive at is shielded, and takes `unaffected`
 *   naming the nearest stop that shields it.
 *
 * Note what is *not* done: a node reachable by a second path that misses the
 * stop stays reached. Shielding requires every route to be blocked, which falls
 * out of the traversal rather than needing to be checked.
 *
 * It also fills `via`, the dependencies a verdict was formed against. That is
 * this node's outgoing edges to things the change reached, and it is derived for
 * the same reason everything else here is: the walk holds every edge, so asking
 * an agent for them would be asking it to restate the graph.
 */
export function deriveVerdicts(nodes: BlastNode[], edges: BlastEdge[]): BlastNode[] {
  /* Outward is against the edges: they point from dependent to dependency. */
  const outward = new Map<string, string[]>()
  /* And inward is the node's own dependencies, which is what `via` names. */
  const inward = new Map<string, string[]>()
  for (const edge of edges) {
    const users = outward.get(edge.to)
    if (users === undefined) outward.set(edge.to, [edge.from])
    else users.push(edge.from)
    const uses = inward.get(edge.from)
    if (uses === undefined) inward.set(edge.from, [edge.to])
    else uses.push(edge.to)
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const stops = new Set(nodes.filter(isStop).map((node) => node.id))

  const sources = nodes
    .filter(
      (node) =>
        node.changed === true ||
        (isAuthored(node) && node.changeType !== "unaffected"),
    )
    .map((node) => node.id)

  /* Breadth first from every source at once, halting at each stop. */
  const reached = new Set<string>(sources)
  let frontier = sources.filter((id) => !stops.has(id))
  while (frontier.length > 0) {
    const next: string[] = []
    for (const id of frontier) {
      for (const user of outward.get(id) ?? []) {
        if (reached.has(user)) continue
        reached.add(user)
        /* A stop is reached and is where this route ends. */
        if (!stops.has(user)) next.push(user)
      }
    }
    frontier = next
  }

  /*
   * The nearest stop shielding each node, by breadth from all stops at once.
   *
   * Only through nodes the change could not reach, so a stop never claims to
   * shield something that is live by another route.
   */
  const shieldedBy = new Map<string, string>()
  let wave = [...stops]
  const seen = new Set(wave)
  while (wave.length > 0) {
    const next: string[] = []
    for (const id of wave) {
      const origin = shieldedBy.get(id) ?? id
      for (const user of outward.get(id) ?? []) {
        if (seen.has(user) || reached.has(user)) continue
        seen.add(user)
        shieldedBy.set(user, origin)
        next.push(user)
      }
    }
    wave = next
  }

  return nodes.map((node) => {
    const { shieldedBy: _wasShielded, via: _wasVia, ...rest } = node

    /*
     * The change itself carries no verdict and no effect.
     *
     * Nothing was done to it. Its outgoing statement is its `contract`, and
     * anything else here would be the two-directions problem returning.
     */
    if (node.changed === true) {
      const { changeType: _noVerdict, effect: _noEffect, ...source } = rest
      return source
    }

    if (isAuthored(node)) {
      const against = (inward.get(node.id) ?? []).filter((id) => reached.has(id))
      return against.length === 0 ? rest : { ...rest, via: against }
    }

    const from = shieldedBy.get(node.id)
    if (from === undefined || byId.get(from) === undefined) {
      const { changeType: _unassessed, ...open } = rest
      return open
    }
    return { ...rest, changeType: "unaffected" as const, shieldedBy: from }
  })
}

/** The first useful line of a Zod failure, prefixed with where it happened. */
function describe(where: string, error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue === undefined) return `${where} is not valid`
  const at = issue.path.length === 0 ? "" : ` at \`${issue.path.join(".")}\``
  return `${where}${at}: ${issue.message}`
}

/**
 * Checks a blast radius.
 *
 * Nodes and edges are parsed one at a time for the reason the code diagram gives:
 * a board missing one card is far more useful than no board and an error.
 *
 * Verdicts are re-derived here rather than trusted. `shieldedBy` is the one
 * field an agent could use to claim coverage it has not got, and a document that
 * arrived from storage after an edge changed would carry a stale one. Deriving
 * on read makes the field a cache of something computable instead of an
 * assertion.
 */
export function checkBlast(value: unknown): {
  blast: Blast | null
  problems: BlastProblem[]
} {
  const outer = blastSchema.safeParse(value)
  if (!outer.success) {
    return { blast: null, problems: [{ message: describe("blast", outer.error) }] }
  }

  const problems: BlastProblem[] = []
  const nodes: BlastNode[] = []
  const ids = new Set<string>()

  for (const [index, entry] of outer.data.nodes.entries()) {
    const parsed = blastNodeSchema.safeParse(entry)
    if (!parsed.success) {
      const id = (entry as { id?: unknown } | null)?.id
      problems.push({
        message: describe(
          typeof id === "string" ? `node "${id}"` : `node ${String(index + 1)}`,
          parsed.error,
        ),
      })
      continue
    }
    const node = parsed.data
    if (ids.has(node.id)) {
      problems.push({ message: `two nodes share the id "${node.id}"` })
      continue
    }
    /*
     * A contract belongs to the change, and only to the change.
     *
     * On a dependent it would be describing a surface nobody altered. What
     * changed *for* a dependent is the contract underneath it, which is already
     * written once on the node that owns it.
     */
    if (node.contract !== undefined && node.changed !== true) {
      problems.push({
        message: `node "${node.id}" has a \`contract\` and was not changed by the diff. A contract states what the change did to a declaration's surface; a dependent is judged against the contract below it, and says so in \`effect\`.`,
      })
      ids.add(node.id)
      const { contract: _dropped, ...rest } = node
      nodes.push(rest)
      continue
    }
    ids.add(node.id)
    nodes.push(node)
  }

  const edges: BlastEdge[] = []
  const drawn = new Set<string>()
  for (const entry of outer.data.edges ?? []) {
    const parsed = blastEdgeSchema.safeParse(entry)
    if (!parsed.success) {
      problems.push({ message: describe("edge", parsed.error) })
      continue
    }
    const edge = parsed.data
    if (!ids.has(edge.from)) {
      problems.push({ message: `edge names \`from\` "${edge.from}", which is not a node` })
      continue
    }
    if (!ids.has(edge.to)) {
      problems.push({ message: `edge names \`to\` "${edge.to}", which is not a node` })
      continue
    }
    /*
     * One declaration can use another by calling it *and* importing it, and
     * that is one relationship, not two. Left in, the force simulation pulls
     * the pair twice as hard as their neighbours and the ring buckles.
     */
    const key = `${edge.from}->${edge.to}`
    if (drawn.has(key)) continue
    drawn.add(key)
    edges.push(edge)
  }

  if (nodes.length === 0) {
    return { blast: null, problems: [...problems, { message: "no usable nodes" }] }
  }

  /*
   * A blast radius with nothing changed in it has no centre, so every hop count
   * is measured from nowhere and every verdict is inherited from nothing. In
   * symbol mode the seeded declaration is the centre and carries the mark.
   */
  if (!nodes.some((node) => node.changed === true)) {
    problems.push({
      message:
        "no node is marked `changed`, so nothing is at the centre. The seeded declarations carry `\"changed\": true`, and every hop count and verdict is measured from them.",
    })
  }

  return {
    blast: {
      type: "blast",
      title: outer.data.title,
      seed: outer.data.seed,
      nodes: deriveVerdicts(nodes, edges),
      edges,
      notes: outer.data.notes ?? [],
    },
    problems,
  }
}

/**
 * What stands between this board and being finished.
 *
 * Separate from `checkBlast`, because they answer different questions at
 * different times: `checkBlast` asks whether a board can be drawn, and a
 * half-assessed one can. This asks whether it can be called done.
 *
 * The first rule is the one the whole inheritance machinery exists to make
 * passable. Demanding an authored verdict on every node would be stricter,
 * unmeetable on a real change, and therefore worth nothing.
 */
export function blastProblems(blast: Blast): BlastProblem[] {
  const problems: BlastProblem[] = []

  for (const node of blast.nodes) {
    if (node.unproven !== undefined && node.unproven.runtime === undefined) {
      problems.push({
        message: `node "${node.id}" is an unproven use at ${node.unproven.path}:${String(node.unproven.line)}. Name what it reaches, or record why it cannot be known before the program runs.`,
      })
    }

    if (node.changed === true) {
      /*
       * The change states its surface, and nothing else is asked of it.
       *
       * Every dependent's verdict is a consequence of this one line, so a
       * changed node without it leaves every judgement above it uncheckable.
       */
      if (node.contract === undefined) {
        problems.push({
          message: `node "${node.id}" (${node.path}) was changed and does not say what its surface is now. Write what anyone using it has to know, before and after.`,
        })
      }
      continue
    }

    if (node.changeType === undefined) {
      problems.push({
        message: `node "${node.id}" (${node.path}) is reachable from the change and unassessed. Say what the change does to it, or assess the node that stops the change reaching it and this one follows.`,
      })
      continue
    }

    if (isAuthored(node) && node.effect === undefined) {
      problems.push({
        message: `node "${node.id}" is assessed \`${node.changeType}\` with nothing said about it. The verdict is the finding; the effect is the evidence for it.`,
      })
    }
  }

  return problems
}

/**
 * What is left to do, in the order it is worth doing.
 *
 * The same question `blastProblems` asks, at a different moment: that one is the
 * gate when an agent says it is finished, this one is the list while it is still
 * working. They live in one file so they cannot drift, which is the mistake
 * `worklistOf` names two directories over.
 *
 * Unproven uses come first because each one may add a whole subtree, so every
 * verdict written before they are answered is provisional. Then the verdicts,
 * which are the point. Then the labels.
 *
 * A shielded node is not on the list at all. That is the inheritance earning its
 * keep: the work is the number of propagation boundaries, not the number of
 * nodes.
 */
export function blastWork(
  blast: Blast,
): { id: string; needs: "answer" | "verdict" | "contract"; message: string }[] {
  const work: { id: string; needs: "answer" | "verdict" | "contract"; message: string }[] = []

  for (const node of blast.nodes) {
    if (node.unproven === undefined || node.unproven.runtime !== undefined) continue
    work.push({
      id: node.id,
      needs: "answer",
      message: `\`${node.label}\` at ${node.unproven.path}:${String(node.unproven.line)} could not be resolved (${node.unproven.reason ?? "no binding"}). Read the code and name what it reaches, or record why it cannot be known before the program runs.`,
    })
  }
  for (const node of blast.nodes) {
    if (node.changed !== true || node.contract !== undefined) continue
    work.push({
      id: node.id,
      needs: "contract",
      message: `\`${node.label}\` (${node.path}) changed. Say what anyone using it has to know, before and after — its surface, not its insides.`,
    })
  }
  for (const node of blast.nodes) {
    if (node.changed === true || node.changeType !== undefined) continue
    work.push({
      id: node.id,
      needs: "verdict",
      message: `\`${node.label}\` (${node.path}) is reachable and unassessed. Say what the change does to it, or assess the node that stops the change reaching it.`,
    })
  }

  return work
}

/** Parses a ```blast fence body. */
export function parseBlast(body: string): {
  blast: Blast | null
  problems: BlastProblem[]
} {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch (cause) {
    return {
      blast: null,
      problems: [
        {
          message: `not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
        },
      ],
    }
  }
  return checkBlast(value)
}
