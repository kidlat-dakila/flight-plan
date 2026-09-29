/**
 * Waypoint anchors: `[Add the detector](#add-the-detector)`.
 *
 * The Overview list above the diagram names the waypoint each item is explained
 * by, so a reader can go from "what changed" to "why" in one click. An ordinary
 * Markdown link, which stays a link with the waypoint's name on it wherever it
 * is read.
 *
 * The slug is derived from the waypoint title the way a Markdown renderer would
 * derive it, so what a reader sees in the title is what they see in the URL.
 *
 * Pure, and in the parse layer, so the validator can check every anchor names a
 * real waypoint without pulling in React or a DOM.
 */

/**
 * The kinds a finding can be, most severe first.
 *
 * Four, and each is a different answer rather than a different intensity:
 * `bug` is broken and proven, `risk` is broken-looking and unproven or merely
 * fragile, `nit` is anything the author may decline, and `question` is the
 * reviewer not knowing. A reader triages on these words, so a fifth would have
 * to earn its place by changing what somebody does about it.
 *
 * `risk` is also where an unproven bug lands. A bug claim that cannot be
 * demonstrated is exactly a risk: the unsafe path looks reachable and nobody
 * has shown it firing.
 *
 * The order is the order they are reported in, and the list lives here rather
 * than in the skill that writes them because the badge is drawn from it, so the
 * renderer and the instructions cannot drift into disagreeing about the set.
 */
import { highestKind } from "../../lib/schemas/document/schema"
import { maskFences } from "../../lib/schemas/document/codeLinks"

export const FINDING_KINDS = ["bug", "risk", "nit", "question"] as const

export type FindingKind = (typeof FINDING_KINDS)[number]

/**
 * The kind each waypoint's marks should be coloured by, in document order.
 *
 * A waypoint carrying findings takes the **highest** of them, which is the same
 * kind its chip shows: the chip and the highlighted lines are one cue. A
 * document-level finding is a card of its own, and its kind is its `badge`.
 * Inheritance is by depth, so a step nested under one takes its kind.
 *
 * Everything else in the tour comes back `null` and keeps the ordinary accent.
 */
export function inheritedKinds(
  steps: readonly {
    level: number
    badge: FindingKind | null
    findings?: readonly { kind: FindingKind }[]
  }[],
): (FindingKind | null)[] {
  // Kind in force at each level, so a level-5 step reads the level-3 finding
  // above it even with a level-4 card in between.
  const open: { level: number; kind: FindingKind | null }[] = []

  return steps.map((step) => {
    while (open.length > 0 && (open[open.length - 1]?.level ?? 0) >= step.level) {
      open.pop()
    }
    // Its own findings first: a card that carries one is not inheriting
    // anything, it is the thing being reported.
    const own = highestKind(step.findings ?? []) ?? step.badge
    const kind = own ?? open[open.length - 1]?.kind ?? null
    open.push({ level: step.level, kind })
    return kind
  })
}

/**
 * The anchor for one waypoint title.
 *
 * Lowercase, punctuation dropped, spaces to hyphens. The common subset of what
 * every Markdown heading slugger does, so the same string is a plausible anchor
 * in any of them. A finding's kind is a field, not part of its title, so a
 * finding whose kind changes keeps its anchor.
 */
export function slugOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
}

/**
 * Slugs for every waypoint, in document order, disambiguated by suffix.
 *
 * Two waypoints may share a title — "The guard" in two sections is ordinary —
 * and they cannot share an anchor. The second gets `-1`, as a Markdown slugger
 * would, so the first keeps the clean name.
 */
export function waypointSlugs(titles: readonly string[]): string[] {
  const seen = new Map<string, number>()
  return titles.map((title) => {
    const base = slugOf(title)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${String(count)}`
  })
}

/** One `#anchor` link and the slug it points at. */
export type Anchor = {
  /** The link text, as written. */
  text: string
  /** The fragment, without the `#`. */
  slug: string
  /** Offset of the opening `[`. */
  at: number
}

/*
 * `[text](#slug)`, and nothing else.
 *
 * Not a general link parser: an `http` link is somebody else's problem and a
 * reference-style link is not something these skills produce.
 */
const ANCHOR = /\[([^\]\n]*)\]\(#([^)\s]+)\)/g

/** Fences blanked, and inline spans with them. */
function maskCode(markdown: string): string {
  return maskFences(markdown)
    .split("\n")
    .map((line) => line.replace(/`+[^`\n]*`+/g, (span) => " ".repeat(span.length)))
    .join("\n")
}

/**
 * Every `#anchor` link in a block of prose, with code ignored.
 *
 * A fenced example of the format is a real thing to write, and the links inside
 * it are not links. The pass that renders them gets this for free by walking
 * the DOM; this is how a caller reading the Markdown reaches the same answer.
 */
export function parseProseAnchors(markdown: string): Anchor[] {
  const found: Anchor[] = []
  for (const match of maskCode(markdown).matchAll(ANCHOR)) {
    found.push({ text: match[1] ?? "", slug: match[2] ?? "", at: match.index })
  }
  return found
}

