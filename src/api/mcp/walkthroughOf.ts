import type { LineRange, RefTarget } from "../../lib/schemas/document/primitives"
import type { SymbolSpan } from "../../lib/codegraph/symbols/spans"

/**
 * A file section per changed file, and the waypoints under it.
 *
 * The walkthrough follows the **change**, where the diagram follows the
 * execution. That is the whole difference between this module and `diagramOf`,
 * and it decides every case where they disagree: a changed constant, a changed
 * JSON file and a file in a language nothing can parse all get a section here
 * and will never be a node there.
 *
 * The parent/child rule is fixed rather than judged, and the schema is why. A
 * waypoint takes two children or none — one child is a flat waypoint written
 * across two cards, where the parent's range *is* the block and the child's
 * mark highlights its whole focus. So a body with one changed block has to be
 * emitted flat, and this implements that rather than discovering it at the
 * write.
 */

export type ScaffoldFence = {
  kind: "ref"
  lang: string
  path: string
  target: RefTarget
  covers?: number[]
}

export type ScaffoldWaypoint = {
  id: string
  title: string
  /**
   * Always set here, and cleared by the first real title.
   *
   * Every title this writes is the declaration's own name or the lines the
   * block covers, and the format is explicit that a bare noun is the one thing
   * a title must not be. The mark is what lets completion refuse a document
   * nobody titled — a title has no empty value that could stand in, the way
   * `null` does for a reading.
   */
  draft: true
  /** Null until somebody writes it. See the document schema. */
  reading: string | null
  code: ScaffoldFence
  children?: ScaffoldWaypoint[]
}

export type ScaffoldSection = {
  path: string
  summary: string[]
  waypoints: ScaffoldWaypoint[]
  /**
   * Whether the structure here was actually derived.
   *
   * False for a section built from the diff alone: bare line ranges derived
   * nothing — no symbol was resolved, no declaration was found. Stored with the
   * section and shown in the projection, so a reader of the document can tell
   * derived structure from the diff restated.
   */
  scaffolded: boolean
}

/** One changed file, as the scaffold reads it. */
export type ChangedFile = {
  path: string
  /** Added line ranges in head-side numbering, in file order. */
  added: readonly LineRange[]
  /** What the file declares, or undefined when nothing could parse it. */
  symbols: readonly SymbolSpan[] | undefined
  /** Set when the file did not exist before this change. See `Hunk`. */
  created?: true
}

/**
 * The fence language, from the file name.
 *
 * The extension, which is what a highlighter wants and what the author would
 * have typed. A file with no extension, or one nothing recognises, gets `text`
 * rather than a guess: a wrong language colours the code misleadingly, and
 * `text` colours it not at all.
 */
function langOf(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path
  const dot = name.lastIndexOf(".")
  if (dot <= 0 || dot === name.length - 1) return "text"
  return name.slice(dot + 1).toLowerCase()
}

/**
 * One contiguous run of added lines, and the hunks it accounts for.
 *
 * `exact` is set on the cards of a created file. Their one hunk is the whole
 * file, so resolution clips it to the card's focus and the focus alone decides
 * the marks. A card like that may only name a declaration that lies inside its
 * own lines: a symbol resolves to the whole declaration, and a card holding the
 * closing brace of an interface would mark the interface from its first line,
 * above the cards before it.
 */
type Group = { range: LineRange; covers: number[]; exact?: true }

/**
 * A created file, cut at its declarations.
 *
 * The one exception to one-card-per-hunk, and it exists because a new file is
 * a single hunk however long it is: without this a four-hundred-line file
 * arrives as one card, which is the diff restated rather than a tour.
 *
 * A partition rather than a pass over declarations with a sweep for what is
 * left. Every line between `range.from` and `range.to` falls in exactly one
 * group — the import block at the top gets its own card because it is the gap
 * before the first declaration, not because anything went looking for it — so
 * nothing can be covered twice and nothing can be missed.
 *
 * Every group still covers hunk 0, because there is only one hunk. Several
 * cards naming the same hunk is right here in a way it was not before: they
 * divide it rather than overlapping on it.
 */
function partition(range: LineRange, symbols: readonly SymbolSpan[] | undefined): Group[] {
  if (symbols === undefined) return [{ range, covers: [0] }]

  const declarations = [...touchedSymbols(symbols, [range])].sort(
    (one, two) => one.from - two.from,
  )

  const out: Group[] = []
  let cursor = range.from
  for (const declaration of declarations) {
    // Clamped to what is left, so a declaration the last group already took —
    // two the parser reported over the same lines — cannot reach backwards.
    const from = Math.max(declaration.from, cursor)
    const to = Math.min(declaration.to, range.to)
    if (to < from) continue
    if (from > cursor) out.push({ range: { from: cursor, to: from - 1 }, covers: [0] })
    out.push({ range: { from, to }, covers: [0] })
    cursor = to + 1
  }
  if (cursor <= range.to) out.push({ range: { from: cursor, to: range.to }, covers: [0] })

  return out.length === 0 ? [{ range, covers: [0] }] : out
}

/**
 * How a file's change divides into cards: one per hunk.
 *
 * **Raw hunks, joined to nothing.** An earlier version merged hunks that sat
 * inside one construct, on the argument that a diff cuts on unchanged lines
 * rather than on code and that one edit with a surviving line through it
 * should not be two cards. That is still true, and it is no longer what this
 * does: the unit a reader sees is the block of changed lines in front of them,
 * and a structure derived from anything else has to be explained before it can
 * be used. An edit split by a context line is two cards, and the prose says so.
 */
function groupsOf(file: ChangedFile): Group[] {
  const whole = file.added[0]
  if (file.created === true && file.added.length === 1 && whole !== undefined) {
    return partition(whole, file.symbols).map((group) => ({ ...group, exact: true as const }))
  }
  return file.added.map((range, index) => ({ range, covers: [index] }))
}

/** How many names a draft title lists before it gives up and counts. */
const LISTED = 3

/**
 * The title the scaffold writes, which is a placeholder in every case.
 *
 * Named after what is in the group rather than the lines it occupies wherever
 * there is a name, because the agent replacing this reads the title first and
 * three symbol names say more about what to write than two line numbers do.
 */
function titleFor(declarations: readonly SymbolSpan[], range: LineRange): string {
  if (declarations.length === 0) {
    return `Lines ${String(range.from)}\u2013${String(range.to)}`
  }
  const names = declarations.map((declaration) => declaration.name)
  if (names.length <= LISTED) return names.join(", ")
  return `${names.slice(0, LISTED).join(", ")} +${String(names.length - LISTED)} more`
}

/**
 * What a card points at.
 *
 * A symbol where the group holds exactly one declaration, and the lines
 * otherwise. The distinction is worth keeping even though the unit is now the
 * hunk: a symbol anchor is repaired when the file moves underneath the
 * document and a line range is not, so a group with one unambiguous owner
 * should say its name. A group holding two declarations has no one name to
 * give, and inventing one would point the card at half of itself.
 */
function anchorFor(declarations: readonly SymbolSpan[], range: LineRange): RefTarget {
  const only = declarations.length === 1 ? declarations[0] : undefined
  return only === undefined
    ? { focus: { from: range.from, to: range.to } }
    : { symbol: only.name }
}

/**
 * A file section per changed file, and one waypoint per group of changed lines.
 *
 * Declarations no longer divide the section; they name and anchor the groups
 * the diff already made. The version before this one looped declarations, so a
 * hunk adding three constants side by side became three cards stacked above
 * one block of code, each explaining a third of what the reader was looking
 * at.
 */
export function sectionsFrom(files: readonly ChangedFile[]): ScaffoldSection[] {
  let next = 0
  const id = (): string => {
    next += 1
    return `w${String(next)}`
  }

  const sections: ScaffoldSection[] = []

  for (const file of files) {
    // A pure deletion has no head-side lines to address. It belongs in the
    // implementation list rather than as a waypoint pointing at nothing.
    if (file.added.length === 0) continue

    const lang = langOf(file.path)

    /*
     * In the order the file reads, which is the only order permitted.
     *
     * A tour reads top to bottom and the document's own checker enforces it:
     * marks may not go backwards within a file. `added` is in file order
     * already, so this normally changes nothing — it is here so that the
     * guarantee belongs to this function rather than to its caller.
     */
    const groups = [...groupsOf(file)].sort((one, two) => one.range.from - two.range.from)

    const waypoints: ScaffoldWaypoint[] = groups.map((group) => {
      const touched =
        file.symbols === undefined ? [] : touchedSymbols(file.symbols, [group.range])
      // See `Group`: a card whose focus is its marks names only what it holds.
      const declarations =
        group.exact === true
          ? touched.filter(
              (declaration) =>
                declaration.from >= group.range.from && declaration.to <= group.range.to,
            )
          : touched
      return {
        id: id(),
        title: titleFor(declarations, group.range),
        draft: true as const,
        reading: null,
        code: {
          kind: "ref",
          lang,
          path: file.path,
          target: anchorFor(declarations, group.range),
          covers: group.covers,
        },
      }
    })

    sections.push({
      path: file.path,
      // The file's implementation items, which are prose and so are the
      // agent's. Empty rather than guessed at.
      summary: [],
      waypoints,
      /*
       * Only where there was something to derive.
       *
       * A file nothing could parse yields waypoints addressed by line range and
       * titled by those lines, which is the diff restated rather than a
       * structure, so it is not marked scaffolded.
       */
      scaffolded: file.symbols !== undefined,
    })
  }

  return sections
}

/**
 * The declarations a diff fell in, with inner declarations folded into the
 * body that holds them.
 *
 * A change inside a function is about the function, not about a local `const`
 * or a closure the parser reports as a child — so an inner declaration is
 * dropped in favour of its container. A container that merely spans another is
 * not a body, so a method inside a class is kept.
 */
function touchedSymbols(
  symbols: readonly SymbolSpan[],
  changed: readonly { from: number; to: number }[],
): SymbolSpan[] {
  const touched = symbols.filter((symbol) =>
    changed.some((range) => range.from <= symbol.to && range.to >= symbol.from),
  )

  /*
   * Anything inside a body belongs to the body.
   *
   * A local `const` inside a function is a child symbol of it, and a closure is
   * another. Neither is what a change is *about*: the waypoint is about the
   * function. A container is not a body — a class holds methods, and a change
   * in a method is about the method.
   */
  const outside = touched.filter(
    (symbol) =>
      !symbols.some(
        (holder) =>
          holder.kind === "callable" &&
          holder !== symbol &&
          symbol.from >= holder.from &&
          symbol.to <= holder.to &&
          (symbol.from > holder.from || symbol.to < holder.to),
      ),
  )

  return outside.filter(
    (symbol) =>
      !outside.some(
        (other) =>
          other !== symbol &&
          other.from >= symbol.from &&
          other.to <= symbol.to &&
          // A declaration that spans the same lines as another is not inside
          // it; one of them is a container the provider reported twice.
          (other.from > symbol.from || other.to < symbol.to) &&
          // And it only counts as inner if the change is in *it*.
          changed.some((range) => range.from <= other.to && range.to >= other.from),
      ),
  )
}
