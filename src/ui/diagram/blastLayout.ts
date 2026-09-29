import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force"
import {
  isAuthored,
  type Blast,
  type BlastEdge,
  type BlastNode,
  type ChangeType,
} from "../../lib/schemas/diagram/blast"

/**
 * Where a blast radius sits on the screen.
 *
 * Pure and separate from the component, the way `layout.ts` is separate from
 * `Diagram.tsx`, and for a stronger reason here: a force simulation is the one
 * piece of this feature whose output is neither obviously right nor obviously
 * wrong by inspection, so it wants tests that do not need a browser.
 *
 * **Radial, one ring per hop**, which is the decision that makes the picture
 * worth drawing. A plain force layout clusters by connectivity and produces
 * something that looks like a map of the module graph — true, and not the
 * question. Pinning each node to a ring of radius `hop × RING` makes screen
 * distance mean *hops from the change*, so the board is literally a radius and a
 * reviewer reads severity-by-proximity without being taught anything.
 *
 * `dagre` was right for the code diagram and is wrong here for the same reason:
 * it draws layered directed graphs, and reach has no layers to draw. A change
 * reaching forty files at hop 2 is forty peers, not a rank.
 */

/**
 * The *least* distance between one hop's ring and the next.
 *
 * A floor rather than the spacing itself: a ring has to hold every card on it,
 * and at a fixed radius its circumference is a hard limit on how many that is.
 * See `ringRadii`.
 */
export const RING = 190

/** Card size, matching the CSS, so collision keeps them apart. */
export const BLAST_NODE_WIDTH = 176
export const BLAST_NODE_HEIGHT = 82

/**
 * How hard a ring pulls.
 *
 * High, and deliberately close to rigid. The ring *is* the information: a node
 * that drifts between rings to satisfy its edges is a node lying about how far
 * it is from the change. Charge and collision get to arrange nodes *around* a
 * ring, never across it.
 */
const RADIAL_STRENGTH = 0.9

/** How hard nodes push apart. Negative is repulsion, as d3 has it. */
const CHARGE = -420

/** How many ticks are run before the positions are taken. */
const TICKS = 300

/** The circle a card keeps to itself, which is what a ring has to find room for. */
const COLLIDE = Math.max(BLAST_NODE_WIDTH, BLAST_NODE_HEIGHT) / 2 + 12

/**
 * Room over and above what the cards strictly need.
 *
 * A ring sized to exactly its cards' width is a ring of cards touching, and the
 * other forces have nowhere to settle. Slack is what lets charge and the link
 * force arrange nodes *around* the ring, which is the job they are left.
 */
const RING_SLACK = 1.15

export type Placed = { id: string; x: number; y: number }

/**
 * A file, and what the change did to the declarations in it.
 *
 * Derived, never authored. A file is not a node — see `blast.ts` — so this is
 * computed on every read rather than stored, which also means it cannot go stale
 * against the nodes it describes.
 */
export type FileGroup = {
  path: string
  ids: string[]
  /** The innermost ring any of its declarations sits on. */
  hop: number
  /** The most severe verdict inside it, which is what the collapsed card shows. */
  worst: Verdict
  /** How many of its declarations somebody actually assessed. */
  authored: number
  /** Whether anything in it is an unanswered unprovable use. */
  unproven: boolean
}

/**
 * Severity order, worst first.
 *
 * `unassessed` ranks above `unaffected` and below the real verdicts, which is
 * the only ordering that makes a collapsed file honest. A file holding one
 * unassessed node and nine unaffected ones is not an unaffected file, and a
 * reviewer scanning collapsed cards has to be able to see that without opening
 * every one of them.
 *
 * `changed` is the change itself. It ranks below the two verdicts about what
 * the change does to others, so a folded file holding the change and a
 * breaking use says "Breaks", and above the rest, so a file holding only the
 * change says so rather than "Unaffected".
 */
const SEVERITY: Record<Verdict, number> = {
  breaks: 4,
  "behaviour-changes": 3,
  changed: 2,
  /* Unassessed outranks unaffected: a file holding one node nobody looked at
     is not an unaffected file, and a reviewer scanning folded cards has to be
     able to see that without opening every one. */
  unassessed: 1,
  unaffected: 0,
}

/**
 * A node's verdict as a card shows it: the schema's change types, "nobody
 * looked", and the change itself, which has no change type by design (it is
 * what every other node is measured against).
 */
export type Verdict = ChangeType | "unassessed" | "changed"

/** What a node shows, treating an absent verdict as its own answer. */
export const verdictOf = (node: BlastNode): Verdict =>
  node.changed === true ? "changed" : (node.changeType ?? "unassessed")

/** The worse of two verdicts. */
export const worseOf = (one: Verdict, two: Verdict): Verdict =>
  SEVERITY[one] >= SEVERITY[two] ? one : two

/** The files on the board, in reading order: nearest the change first. */
export function groupsOf(blast: Blast): FileGroup[] {
  const byPath = new Map<string, FileGroup>()

  for (const node of blast.nodes) {
    const found = byPath.get(node.path)
    const unproven = node.unproven !== undefined && node.unproven.runtime === undefined
    if (found === undefined) {
      byPath.set(node.path, {
        path: node.path,
        ids: [node.id],
        hop: node.hop,
        worst: verdictOf(node),
        authored: isAuthored(node) ? 1 : 0,
        unproven,
      })
      continue
    }
    found.ids.push(node.id)
    found.hop = Math.min(found.hop, node.hop)
    found.worst = worseOf(found.worst, verdictOf(node))
    if (isAuthored(node)) found.authored += 1
    if (unproven) found.unproven = true
  }

  return [...byPath.values()].sort(
    (one, two) =>
      one.hop - two.hop ||
      SEVERITY[two.worst] - SEVERITY[one.worst] ||
      one.path.localeCompare(two.path),
  )
}

/**
 * Which files open on arrival: all of them.
 *
 * The board is a graph and it arrives drawn as one. Folding was the default
 * once, on the argument that a thousand declarations drawn as a thousand cards
 * is a picture of nothing — true at a thousand, and wrong at the sizes real
 * boards come in, where it hid the whole shape of the reach behind a handful of
 * file cards a reviewer had to click to discover. Folding stays a gesture: a
 * click on any file card collapses it, and the card still carries the count and
 * the worst verdict inside, so nothing is lost by folding what is too much.
 */
export const openOnArrival = (groups: readonly FileGroup[]): Set<string> =>
  new Set(groups.map((group) => group.path))

type Datum = SimulationNodeDatum & { id: string; hop: number }

/**
 * How far out each hop's ring sits, given how many cards are on it.
 *
 * A fixed `hop × RING` was a promise the geometry could not keep. A ring's
 * circumference is what it has to fit its cards into, and past that collision
 * beats the radial pull and the nodes spill inward and outward: at twenty-four
 * dependents on one hop the ring stopped being a ring and swallowed the one
 * beyond it, which is precisely the reading the radial force exists to protect.
 *
 * So a ring grows to hold its own population, and never sits closer than `RING`
 * to the ring inside it. Both halves matter. Without the first a busy hop
 * collapses into a scrum; without the second a widened ring overruns the next
 * one out and two hops read as one distance.
 *
 * Nothing shrinks: a radius is never less than `hop × RING`, so a sparse board
 * lays out exactly as it did before and screen distance still means hops.
 */
function ringRadii(hops: readonly number[]): Map<number, number> {
  const population = new Map<number, number>()
  for (const hop of hops) population.set(hop, (population.get(hop) ?? 0) + 1)

  const radii = new Map<number, number>()
  let previous = 0
  for (const hop of [...population.keys()].sort((one, two) => one - two)) {
    const count = population.get(hop) ?? 0
    /*
     * What the cards need, as a radius.
     *
     * Each wants `2 × COLLIDE` of arc, so the circumference has to reach
     * `count × 2 × COLLIDE × RING_SLACK`, and a circumference is `2πr`. One
     * card needs no ring at all: it sits wherever the other forces put it.
     */
    const needed = count <= 1 ? 0 : (count * COLLIDE * RING_SLACK) / Math.PI
    const wanted = Math.max(hop * RING, needed)
    const radius = hop === 0 ? wanted : Math.max(wanted, previous + RING)
    radii.set(hop, radius)
    previous = radius
  }
  return radii
}

/**
 * Settles the graph and reports where everything landed.
 *
 * Runs the simulation to completion synchronously rather than animating it. The
 * positions are stored on the document afterwards, so a reader opening the board
 * a second time gets the board they saw the first time — and a layout that
 * rearranged itself on every open would make "the thing on the left" stop
 * meaning anything between two people looking at the same review.
 *
 * A node that already carries `pos` keeps it. The author's placement wins
 * outright, exactly as it does in the code diagram.
 */
export function layoutBlast(
  nodes: readonly BlastNode[],
  edges: readonly BlastEdge[],
): Placed[] {
  if (nodes.length === 0) return []

  const fixed = new Map<string, Placed>()
  const free: BlastNode[] = []
  for (const node of nodes) {
    if (node.pos === undefined) free.push(node)
    else fixed.set(node.id, { id: node.id, x: node.pos[0], y: node.pos[1] })
  }
  if (free.length === 0) return [...fixed.values()]

  /*
   * A deterministic starting ring rather than d3's phyllotaxis.
   *
   * The simulation is run for a fixed number of ticks from a fixed start, so the
   * same board lays out the same way twice. That matters more than it sounds:
   * these positions are written to the document, and a layout that depended on
   * insertion order would make every re-run a diff.
   */
  const radii = ringRadii(free.map((node) => node.hop))
  const data: Datum[] = free.map((node, index) => {
    const radius = radii.get(node.hop) ?? node.hop * RING
    const angle = (index / free.length) * Math.PI * 2
    return {
      id: node.id,
      hop: node.hop,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    }
  })

  const byId = new Map(data.map((datum) => [datum.id, datum]))
  const links: SimulationLinkDatum<Datum>[] = []
  for (const edge of edges) {
    const source = byId.get(edge.from)
    const target = byId.get(edge.to)
    if (source === undefined || target === undefined) continue
    links.push({ source, target })
  }

  const simulation = forceSimulation(data)
    .force("charge", forceManyBody<Datum>().strength(CHARGE))
    .force(
      "link",
      forceLink<Datum, SimulationLinkDatum<Datum>>(links)
        .id((datum) => datum.id)
        /* One ring apart, because that is what one edge means here. */
        .distance(RING)
        /*
         * Weak, and that is the whole trick. A link force strong enough to
         * satisfy the edges would drag nodes off their rings, and the ring is
         * the information. Edges get to choose *where around* a ring a node
         * sits; they do not get to choose which ring.
         */
        .strength(0.08),
    )
    .force(
      "radial",
      forceRadial<Datum>(
        (datum) => radii.get(datum.hop) ?? datum.hop * RING,
        0,
        0,
      ).strength(RADIAL_STRENGTH),
    )
    .force(
      "collide",
      forceCollide<Datum>(COLLIDE),
    )
    .stop()

  simulation.tick(TICKS)

  const placed: Placed[] = data.map((datum) => ({
    id: datum.id,
    x: datum.x ?? 0,
    y: datum.y ?? 0,
  }))
  return [...fixed.values(), ...placed]
}

/** A card on the board, as the edges need to see it. */
export type CardRect = { x: number; y: number; width: number; height: number }

/**
 * Where a line out of a card's centre crosses the card's own border.
 *
 * What makes the edges point at the boxes rather than at the sides of them.
 * Fixed handles are the usual way and they are wrong for this board: a handle
 * names one of four sides, and a radial layout puts cards at every angle, so a
 * card at forty-five degrees gets a line into its corner and one at thirty gets
 * a line into nothing. The diagram can pin its handles because dagre gives
 * every edge an axis; reach has no axis.
 *
 * So the line aims at the centre and stops at the edge. The scale trick below
 * is the whole of it: divide the offset by each half-extent, and the larger
 * quotient names the side the ray leaves through — bring that one to exactly 1
 * and the point is on the border.
 *
 * A `towards` inside the rect scales *up* rather than down, which is what
 * should happen: two cards on top of each other still get a line between their
 * borders instead of a dot inside them.
 */
export function borderPoint(
  rect: CardRect,
  towards: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const dx = towards.x - cx
  const dy = towards.y - cy
  /* Concentric cards have no direction to leave in. */
  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const scale = Math.max(
    Math.abs(dx) / (rect.width / 2),
    Math.abs(dy) / (rect.height / 2),
  )
  return { x: cx + dx / scale, y: cy + dy / scale }
}

/**
 * How much room the drawn board needs.
 *
 * From the placements rather than the DOM, so the panel knows how tall to make
 * the board before React Flow has drawn a thing — the same order the diagram
 * does it in, and the reason neither board has to be measured and re-laid out.
 *
 * Null for an empty board: there is no extent, and the stylesheet's own height
 * is the answer.
 */
export function blastExtent(
  nodes: readonly { x: number; y: number }[],
): { width: number; height: number } | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
  }
  /* A placement is a card's corner, so the far card's own size is part of it. */
  return {
    width: maxX - minX + BLAST_NODE_WIDTH,
    height: maxY - minY + BLAST_NODE_HEIGHT,
  }
}

/** How far from the centre a node ended up, which is what the rings promise. */
export const radiusOf = (placed: Placed): number => Math.hypot(placed.x, placed.y)

/**
 * What is actually on screen, given which files are open.
 *
 * Pure, and separate from the component, because this is where collapsing is
 * decided and collapsing is the claim the whole view rests on: **a folded file
 * hides nothing**. Its card carries the count and the worst verdict inside it,
 * and every edge that crossed its boundary still crosses the card's. A reviewer
 * looking at a collapsed board is looking at the same graph, drawn coarser.
 *
 * Positions come from one layout of the *whole* declaration graph, and a
 * collapsed file sits at the centre of its own declarations. That is what keeps
 * a card from jumping across the board when somebody opens it: expanding a file
 * spreads its declarations around where the folded card already was.
 */
export type Projected = {
  nodes: (
    | { kind: "node"; id: string; node: BlastNode; x: number; y: number }
    | { kind: "file"; id: string; group: FileGroup; x: number; y: number }
  )[]
  edges: { id: string; from: string; to: string; crossing: boolean }[]
}

/**
 * The id a folded file draws under, and how to read it back.
 *
 * A pair rather than a prefix written out twice. The layout builds these ids and
 * the board parses them back to know which file a click folded, and those are
 * two files: a prefix spelled slightly differently in one of them fails by
 * silently never matching, which looks like a click that does nothing.
 *
 * `file:` cannot collide with a declaration's id, which is always `path:line`
 * with a numeric tail.
 */
export const fileNodeId = (path: string): string => `file:${path}`

export const pathOfFileNode = (id: string): string | null =>
  id.startsWith("file:") ? id.slice("file:".length) : null

export function projectBlast(
  blast: Blast,
  open: ReadonlySet<string>,
  placements?: readonly Placed[],
): Projected {
  const groups = groupsOf(blast)
  const placed = new Map(
    (placements ?? layoutBlast(blast.nodes, blast.edges)).map((one) => [one.id, one]),
  )

  /** Which drawn node a declaration is currently part of: itself, or its file. */
  const standsFor = new Map<string, string>()
  const nodes: Projected["nodes"] = []

  for (const group of groups) {
    if (open.has(group.path)) {
      for (const id of group.ids) {
        const node = blast.nodes.find((one) => one.id === id)
        if (node === undefined) continue
        const at = placed.get(id)
        standsFor.set(id, id)
        nodes.push({ kind: "node", id, node, x: at?.x ?? 0, y: at?.y ?? 0 })
      }
      continue
    }
    /*
     * The folded card sits where its declarations already are, so opening it
     * spreads them around the card rather than moving the card.
     */
    const points = group.ids.map((id) => placed.get(id)).filter((one) => one !== undefined)
    const x = points.reduce((sum, one) => sum + one.x, 0) / Math.max(points.length, 1)
    const y = points.reduce((sum, one) => sum + one.y, 0) / Math.max(points.length, 1)
    const id = fileNodeId(group.path)
    for (const member of group.ids) standsFor.set(member, id)
    nodes.push({ kind: "file", id, group, x, y })
  }

  /*
   * Edges are projected onto whatever is drawn, then deduplicated.
   *
   * Two declarations in one folded file using the same target is one arrow, and
   * an edge that ends up pointing at its own card is not drawn — a file using
   * itself is not a fact about the change. `crossing` marks an edge at least one
   * end of which is folded, so the view can draw it thicker: it stands for
   * several.
   */
  const drawn = new Map<string, { id: string; from: string; to: string; crossing: boolean }>()
  for (const edge of blast.edges) {
    const from = standsFor.get(edge.from)
    const to = standsFor.get(edge.to)
    if (from === undefined || to === undefined || from === to) continue
    const id = `${from}->${to}`
    const crossing = from !== edge.from || to !== edge.to
    const found = drawn.get(id)
    if (found === undefined) drawn.set(id, { id, from, to, crossing })
    else if (crossing) found.crossing = true
  }

  return { nodes, edges: [...drawn.values()] }
}
