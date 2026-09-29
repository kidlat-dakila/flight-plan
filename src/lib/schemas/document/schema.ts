import { z } from "zod"
import { lineRange, refTarget, repoName, sha } from "./primitives"

/**
 * The authored document.
 *
 * What a skill writes and what MCP accepts: only what the agent observed. Every
 * field the repository already knows — where a symbol is, which lines changed,
 * what sits on a range's first line — is resolved at write time and lives in
 * `./stored`.
 *
 * Shape is checked here; relationships are checked in `./check`. Zod is good at
 * "this field is one of these three strings" and poor at "this id is declared
 * elsewhere in the same document", so each does the half it suits.
 */

export type Kind = "walkthrough" | "plan"

/**
 * Whether the document is finished.
 *
 * A walkthrough is written in pieces, and a reader should not have to wait for
 * the last one. So a document opens as soon as it has a context section and
 * grows underneath them, and this is what says which state they are looking at.
 * The panel draws an indicator from it, because a reader who cannot tell a
 * half-written document from a finished one will read a gap as an omission.
 *
 * `complete` is the default, and that is what makes every document written
 * before this field readable: they were all finished when they were stored.
 * Nothing becomes complete on its own — an agent has to say so, and saying so
 * is what runs the checks that a partial document cannot pass.
 */
export const DOCUMENT_STATUS = ["drafting", "complete"] as const
export type DocumentStatus = (typeof DOCUMENT_STATUS)[number]

const status = z.enum(DOCUMENT_STATUS).default("complete")

/**
 * Where a walkthrough is filed.
 *
 * A pull request has a number. A branch reviewed with plain git has only its
 * name, and there is no number to invent that would not later collide with a
 * real pull request.
 */
const filedAt = z.union([
  z.object({ pr: z.number().int().positive() }).strict(),
  z.object({ branch: z.string().min(1) }).strict(),
])

/**
 * The subject, and the fields its kind gates.
 *
 * `strict` on every arm, and that is what does the work. A walkthrough with no
 * `head` and a plan *with* one were two of the most frequent findings under the
 * Markdown format; both are now unrepresentable rather than reported.
 */
export const meta = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("walkthrough"),
      repo: repoName,
      at: filedAt,
      /** Every reference is read at this commit, and staleness measured from it. */
      head: sha,
      base: sha.optional(),
      status,
    })
    .strict(),
  z
    .object({
      kind: z.literal("plan"),
      repo: repoName,
      name: z.string().min(1),
      branch: z.string().min(1).optional(),
      status,
    })
    .strict(),
])

export type Meta = z.output<typeof meta>

/*
 * No `see`.
 *
 * It used to hold the ids of the waypoints that produced an outcome, which
 * pointed a reader at the *explanation*. The text now points at the **code**,
 * with an ordinary link in the sentence:
 *
 *     then: "the refusal names every short line, from [`hasStock()`](code:src/a.ts#hasStock)"
 *
 * That answers the question a reader is actually asking. An id told them which
 * card to go and read; a link says which function does it, shows the lines on
 * hover, and is checked against the repository when the document is written --
 * so a sentence cannot quietly describe code that is not there.
 */
export const scenario = z
  .object({
    /** A situation, in the reader's terms. Not a code path. */
    when: z.string().min(1),
    /** What a person or another system can observe. */
    then: z.string().min(1),
  })
  .strict()

export type Scenario = z.output<typeof scenario>

export const group = z
  .object({
    /** The place. A path, a directory, or an area when many files change once. */
    label: z.string().min(1),
    /** Set when the label is a real path, so it can be checked and linked. */
    path: z.string().min(1).optional(),
    /**
     * One per change a reader would have to notice, each opening with the verb.
     *
     * Name the code with a link rather than describing it: "Added
     * [`levelsFor()`](code:src/a.ts#levelsFor), which reads every level in one
     * query" says which function, and proves it exists.
     */
    items: z
      .array(z.object({ text: z.string().min(1) }).strict())
      .min(1, "a group with no items names a place and says nothing about it"),
  })
  .strict()

export type Group = z.output<typeof group>

export const contextBody = z
  .object({
    /** Why anyone should care. Five sentences at most, and no identifiers. */
    context: z.string().min(1),
    /** What changes from outside. Required once the document is complete. */
    overview: z.array(scenario).optional(),
    /** What changed inside, by place. Required once the document is complete. */
    implementation: z.array(group).optional(),
  })
  .strict()

export type ContextBody = z.output<typeof contextBody>

/**
 * A reference to code that exists.
 *
 * No `marks`: they are derived from the diff. `covers` names which hunks of
 * this file the waypoint explains, and the resolver turns those into marks —
 * so the author says *which change* rather than *which lines*, and the two
 * cannot disagree.
 */
export const refFence = z
  .object({
    kind: z.literal("ref"),
    lang: z.string().min(1),
    path: z.string().min(1),
    target: refTarget,
    covers: z.array(z.number().int().min(0)).optional(),
  })
  .strict()

/** Where a proposal's body goes in the file it changes. One verb, one number. */
export const proposalPosition = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("after"), line: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal("before"), line: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal("replace"), lines: lineRange }).strict(),
  /** The file does not exist yet, so the body is all of it. */
  z.object({ kind: z.literal("new") }).strict(),
])

export type ProposalPosition = z.output<typeof proposalPosition>

/**
 * Code that does not exist yet, and where it would go.
 *
 * The one fence whose body is the point rather than a mistake. `marks` here
 * count from the first *proposed* line, not from the file: proposed lines have
 * no file line number.
 */
export const proposalFence = z
  .object({
    kind: z.literal("proposal"),
    lang: z.string().min(1),
    path: z.string().min(1),
    position: proposalPosition,
    body: z.string().min(1, "a proposal with an empty body proposes nothing"),
    marks: z.array(lineRange).optional(),
  })
  .strict()

export const fence = z.discriminatedUnion("kind", [refFence, proposalFence])

export type RefFence = z.output<typeof refFence>
export type ProposalFence = z.output<typeof proposalFence>
export type Fence = z.output<typeof fence>

/**
 * A proposed replacement for the lines its waypoint is about.
 *
 * No path and no position, and that is the whole design: the waypoint the
 * finding hangs on already names a range, so a solution says "these lines
 * become this" and nothing has to agree with anything. It is what lets the
 * panel preview a fix without a file switcher, and it is why a fix that spans
 * files is not expressible — deliberately, because one that did could not be
 * previewed against the one file the panel is showing.
 */
export const solution = z
  .object({
    lang: z.string().min(1),
    body: z.string().min(1, "a solution with an empty body proposes nothing"),
  })
  .strict()

export type Solution = z.output<typeof solution>

export type Waypoint = {
  id: string
  title: string
  /**
   * Set while the title is still the one the scaffold wrote.
   *
   * A scaffolded title is the declaration's own name or the lines it covers,
   * which is exactly what the format says a title must never be: a bare noun
   * says which code the card is about and nothing about why the reader is being
   * shown it. Unlike an unwritten `reading` there is no sentinel string that
   * could mark one — an arm's title is arbitrary source text — so the fact is
   * recorded rather than inferred, and `update-nodes` clears it by writing a
   * real title.
   *
   * Absent, never false, so a hand-written document carries nothing extra.
   */
  draft?: true
  /**
   * Null until somebody writes it.
   *
   * A sentinel string said "unwritten" in a field typed as prose, so every
   * reader had to know the one string that means nothing rather than reading
   * the type. `null` says it in the schema, which is where a validator can see
   * it and where an agent filling the document cannot mistake it for content.
   */
  reading: string | null
  /**
   * Why a reviewer must not skim this change, when the agent judges they must.
   *
   * The agent's reasoning, and its presence is the flag: a chip with nothing
   * behind it and a reason nobody is shown are both unrepresentable. It
   * replaced a worked example, which answered a question — "what does this do
   * on real input" — that a reviewer can already answer by reading. This
   * answers one they cannot: which of forty cards is the one to slow down on.
   */
  needsAttention?: string
  /**
   * What is wrong with this code, where the agent found something.
   *
   * On the card rather than in a section at the end, because a finding and the
   * code it is about are one subject: a reviewer who meets the claim after
   * reading the tour has already read it without knowing what to doubt.
   *
   * A finding here carries no fence of its own — its lines are this waypoint's
   * lines. The document keeps a top-level list as well, for what belongs to no
   * card at all.
   */
  findings?: WaypointFinding[]
  code: Fence | null
  children?: Waypoint[]
}

/** A finding that belongs to one waypoint. See `waypoint.findings`. */
export type WaypointFinding = {
  id: string
  kind: FindingKind
  title: string
  reading: string
  trace?: string[]
  solution?: Solution
}

/**
 * One waypoint, and the ones nested inside it.
 *
 * Depth is nesting rather than a heading level, so a block three ranks below
 * its body is unrepresentable instead of reported. `z.lazy` because the type is
 * recursive; the explicit annotation because TypeScript cannot infer it.
 *
 * **Two children or none, never one.** A parent with a single child is a flat
 * waypoint written across two cards: the parent's range *is* the block, so the
 * child's mark would highlight its whole focus, which highlights nothing, and
 * both cards give the same reason for the same lines.
 */
/**
 * The kinds a finding can be, most severe first.
 *
 * Four, and each is a different answer rather than a different intensity. The
 * order is the order they are reported in.
 */
export const FINDING_KINDS = ["bug", "risk", "nit", "question"] as const
export type FindingKind = (typeof FINDING_KINDS)[number]

/**
 * How severe a kind is, lowest number first. `FINDING_KINDS` is the order.
 *
 * A card shows one chip however many findings it carries, and this is what
 * picks it: a card with a bug and a nit says bug, because the bug is why a
 * reviewer would stop. The count is left off — the list inside says how many,
 * and a chip that carried both a kind and a number stopped being scannable.
 */
export function highestKind(
  findings: readonly { kind: FindingKind }[],
): FindingKind | null {
  let best: FindingKind | null = null
  for (const one of findings) {
    if (best === null || FINDING_KINDS.indexOf(one.kind) < FINDING_KINDS.indexOf(best)) {
      best = one.kind
    }
  }
  return best
}

/**
 * A finding that belongs to one waypoint.
 *
 * No `code`: its lines are the lines of the card it hangs on, which is what
 * makes a solution expressible as a bare replacement and what stops one card
 * carrying two fences that have to agree.
 */
export const waypointFinding = z
  .object({
    id: z.string().min(1),
    kind: z.enum(FINDING_KINDS),
    title: z.string().min(1),
    reading: z.string().min(1),
    /** The steps that prove it. Markdown inline; carries `code:` links. */
    trace: z.array(z.string().min(1)).min(1).optional(),
    solution: solution.optional(),
  })
  .strict()
  .refine(
    (f) => f.kind !== "question" || f.solution === undefined,
    "a question carries no solution: a fix attached to one is a suggestion wearing a question's chip",
  )
  .refine(
    (f) => f.kind !== "question" || f.trace === undefined,
    "a question carries no trace: there is no claim to prove",
  )

export const waypoint: z.ZodType<Waypoint> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      draft: z.literal(true).optional(),
      reading: z.string().min(1).nullable(),
      needsAttention: z.string().min(1).optional(),
      findings: z.array(waypointFinding).min(1).optional(),
      code: fence.nullable(),
      children: z
        .array(waypoint)
        .refine(
          (kids) => kids.length !== 1,
          "a waypoint takes two children or none; one child is a flat waypoint written across two cards",
        )
        .optional(),
    })
    .strict(),
)

/**
 * A finding, with its kind as a field rather than a bracket in its title.
 *
 * The per-kind rules are schema rules now. A `question` is the reviewer not
 * knowing, so a fix attached to one is a suggestion wearing a question's chip.
 *
 * Its `solution` replaces the lines its own `code` names, the way a waypoint
 * finding's replaces its card's. Optional here, because a document is stored
 * while it is being written; `checkComplete` is where a finished one must
 * carry it.
 */
export const finding = z
  .object({
    id: z.string().min(1),
    kind: z.enum(FINDING_KINDS),
    title: z.string().min(1),
    reading: z.string().min(1),
    /** The steps that prove it. Markdown inline; carries `code:` links. */
    trace: z.array(z.string().min(1)).min(1).optional(),
    code: fence.nullable(),
    solution: solution.optional(),
  })
  .strict()
  .refine(
    (f) => f.kind !== "question" || f.solution === undefined,
    "a question carries no solution: a fix attached to one is a suggestion wearing a question's chip",
  )
  .refine(
    (f) => f.kind !== "question" || f.trace === undefined,
    "a question carries no trace: there is no claim to prove",
  )

export type DocFinding = z.output<typeof finding>

/*
 * A file section, and a walkthrough, may be empty *while being written*.
 *
 * The minimums moved to `checkComplete`, which runs when an agent says the
 * document is finished. They are still the rule — a tour with no waypoints is
 * not a tour — but enforcing them in the shape would mean a document could not
 * be stored until it was finished, and the whole point of storing it early is
 * that somebody can start reading.
 */
export const fileSection = z
  .object({
    /** Repository-relative path. Was the `## <path>` heading. */
    path: z.string().min(1),
    /** This file's Implementation Overview items, without the links. */
    summary: z.array(z.string().min(1)),
    waypoints: z.array(waypoint),
    /**
     * Whether the structure under this path was derived rather than written.
     *
     * Set by the scaffold and by nothing else. It decides which tools may write
     * here: a derived section is filled in by id and refuses to be replaced
     * wholesale, because replacing it is how the fixed parent/child split gets
     * quietly renegotiated by an agent that found it awkward.
     *
     * Per section rather than per document, and that is the whole reason it is
     * a field instead of a flag on `meta`. A pull request touching five
     * TypeScript files and two Ruby files scaffolds five of them; the other two
     * have to stay writable the old way, or the tool stops working for
     * repositories it used to serve.
     */
    scaffolded: z.boolean().optional(),
  })
  .strict()

export type FileSection = z.output<typeof fileSection>

export const codeWalkthrough = z
  .object({
    /** One line saying what the tour follows. */
    note: z.string().min(1).optional(),
    files: z.array(fileSection),
  })
  .strict()

/**
 * A diagram, or a statement that there is none.
 *
 * A change with genuinely no flow still answers the question. An absent section
 * is only a question; one line saying why is something a reader can trust.
 * The diagram itself is checked by `checkDiagram`, not here — this slot only
 * says which of the two shapes arrived.
 */
const diagramSlot = z.union([
  z.object({ absent: z.string().min(1) }).strict(),
  z.looseObject({ type: z.literal("code") }),
])

/**
 * The blast radius, when one was walked.
 *
 * Optional where `diagram` is required, and the asymmetry is the point. Every
 * change has a flow or a reason it has none, so a missing code diagram is a
 * question. A blast radius is a second, slower walk answering a different
 * question, and a document without one is not incomplete — it is a document
 * nobody asked that question of.
 *
 * Checked by `checkBlast` rather than here, exactly as the diagram is: this slot
 * only says which shape arrived.
 */
const blastSlot = z.union([
  z.object({ absent: z.string().min(1) }).strict(),
  z.looseObject({ type: z.literal("blast") }),
])

export const documentInput = z
  .object({
    schema: z.literal(1),
    meta,
    /** The pull request's own title, copied. Never improved on. */
    title: z.string().min(1),
    contextBody,
    diagram: diagramSlot,
    blast: blastSlot.optional(),
    codeWalkthrough,
    /**
     * Absent when there is nothing to report.
     *
     * Never an empty array: a document with nothing to report has no section
     * rather than a section saying so.
     */
    findings: z.array(finding).min(1).optional(),
  })
  .strict()

export type DocumentInput = z.output<typeof documentInput>
