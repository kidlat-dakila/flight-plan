import { z } from "zod"
import { checkDiagram } from "../diagram/schema"
import { lineRange, sha } from "./primitives"
import {
  contextBody,
  FINDING_KINDS,
  waypointFinding,
  meta,
  proposalFence,
  refFence,
  solution,
} from "./schema"

/**
 * The stored document: every derivable field resolved.
 *
 * The renderer only ever sees this. It does not know symbols exist, and it does
 * not know a diff was parsed — it is handed ranges, marks and hunks, which is
 * what it was always handed.
 *
 * Resolution happens once, at write time, against a pinned substrate. That is
 * the whole trade this format makes: the author writes what they observed, the
 * repository answers everything else, and neither has to be right twice.
 *
 * Each stored shape **extends** its authored one rather than restating it. The
 * authored fields are still checked here, so a document that reached storage
 * malformed is caught by the same rules that would have refused it on the way
 * in, and the two cannot drift apart.
 */

/** Lines deleted, and the rendered line they sat after. 0 is the file's top. */
export const removal = z
  .object({ after: z.number().int().min(0), lines: z.array(z.string()) })
  .strict()

export const hunk = z
  .object({
    added: z.array(lineRange),
    removed: z.array(removal),
    /**
     * The file did not exist before the change. Written by the diff reader
     * (`src/api/pr/hunks.ts`) for a new file; absent otherwise. It was left
     * out of this schema, so every walkthrough of a change that adds a file
     * was stored and then refused on read: "Unrecognized key: created".
     */
    created: z.literal(true).optional(),
  })
  .strict()

export type Removal = z.output<typeof removal>
export type Hunk = z.output<typeof hunk>

export const resolvedSource = z
  .object({
    /** The commit the file was read at. `null` for a plan — the working tree. */
    at: sha.nullable(),
    /** What the change did to this file. Absent on a plan. */
    hunks: hunk.optional(),
  })
  .strict()

export type ResolvedSource = z.output<typeof resolvedSource>

/**
 * Text on the first line of a range or a position, captured at write time.
 *
 * It matters least where it is most visible and most where it is least. A
 * walkthrough reads its files at a pinned commit, so the substrate cannot move
 * and the repair never fires. A **plan** resolves against the working tree,
 * which changes under it as the reader implements the earlier waypoints — which
 * is exactly when a later position slides onto the wrong line.
 */
const expectLine = z.string().min(1).optional()

const storedRefFence = refFence.extend({
  /** Where the target resolved to. Never absent: unresolved is not storable. */
  focus: lineRange,
  /** The hunks named by `covers`, as file line ranges. */
  marks: z.array(lineRange).optional(),
  expect: expectLine,
})

const storedProposalFence = proposalFence.extend({ expect: expectLine })

export const storedFence = z.discriminatedUnion("kind", [
  storedRefFence,
  storedProposalFence,
])

export type StoredRefFence = z.output<typeof storedRefFence>
export type StoredProposalFence = z.output<typeof storedProposalFence>
export type StoredFence = z.output<typeof storedFence>

export type StoredWaypoint = {
  id: string
  title: string
  /** Set while the title is still the scaffold's. See `schema.ts`. */
  draft?: true
  /** Null until somebody writes it. See `./schema`. */
  reading: string | null
  /** Why a reviewer must not skim this change. See `./schema`. */
  needsAttention?: string
  /** What is wrong with this code. See `./schema`. */
  findings?: z.output<typeof waypointFinding>[]
  code: StoredFence | null
  children?: StoredWaypoint[]
}

/**
 * A waypoint on its way in, with the field it used to carry taken off.
 *
 * `example` was replaced by `needsAttention`, and every object here is strict,
 * so a walkthrough written before the swap would stop opening over a field
 * nothing reads any more. The examples are going either way; refusing the whole
 * document rather than dropping them would lose the reading, the tour and the
 * diagram too.
 *
 * On the way *in* only. The authored `documentInput` stays strict, so an agent
 * that sends `example` on a new document is refused and told the field is gone
 * — which is how the skills' readers find out. Forgiving it there would let the
 * old shape be written for as long as anyone kept writing it.
 */
function withoutRetired(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value
  const { example: _wasExample, ...rest } = value as Record<string, unknown>
  /*
   * A `solution` used to be an array of waypoints hanging off a document-level
   * finding. It is a single replacement for one card's lines now, so the array
   * form names nothing here — dropped by shape rather than by key, because the
   * new form is stored under the same name and must survive.
   */
  if (Array.isArray(rest["solution"])) delete rest["solution"]
  return rest
}

const storedWaypoint: z.ZodType<StoredWaypoint> = z.lazy(() =>
  z.preprocess(
    withoutRetired,
    z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        draft: z.literal(true).optional(),
        reading: z.string().min(1).nullable(),
        needsAttention: z.string().min(1).optional(),
        findings: z.array(waypointFinding).min(1).optional(),
        code: storedFence.nullable(),
        children: z.array(storedWaypoint).optional(),
      })
      .strict(),
  ),
)

const storedFinding = z.preprocess(
  withoutRetired,
  z
  .object({
    id: z.string().min(1),
    kind: z.enum(FINDING_KINDS),
    title: z.string().min(1),
    reading: z.string().min(1),
    trace: z.array(z.string().min(1)).optional(),
    code: storedFence.nullable(),
    solution: solution.optional(),
  })
  .strict(),
)

export type StoredFinding = z.output<typeof storedFinding>

/** Every path any fence in the document names, deduplicated. */
export function fencePaths(doc: {
  codeWalkthrough: { files: { waypoints: StoredWaypoint[] }[] }
  findings?: StoredFinding[]
}): string[] {
  const seen = new Set<string>()
  const walk = (points: readonly StoredWaypoint[]): void => {
    for (const point of points) {
      if (point.code !== null) seen.add(point.code.path)
      if (point.children !== undefined) walk(point.children)
    }
  }
  for (const file of doc.codeWalkthrough.files) walk(file.waypoints)
  for (const found of doc.findings ?? []) {
    if (found.code !== null) seen.add(found.code.path)
  }
  return [...seen]
}

export const storedDocument = z
  .object({
    schema: z.literal(1),
    meta,
    title: z.string().min(1),
    contextBody,
    diagram: z.unknown(),
    /** The blast radius, when one was walked. Checked by `checkBlast`, not here. */
    blast: z.unknown().optional(),
    /*
     * No minimums, for the same reason the authored shape has none.
     *
     * A document is stored from its first piece onward so a reader can start
     * on it, and that first piece is a title and a context section with no
     * tour under it yet. "A tour needs waypoints" is still the rule; it is
     * checked by `checkComplete` when an agent says the document is finished.
     */
    codeWalkthrough: z
      .object({
        note: z.string().min(1).optional(),
        files: z.array(
          z
            .object({
              path: z.string().min(1),
              summary: z.array(z.string().min(1)),
              waypoints: z.array(storedWaypoint),
              /** Whether the scaffold derived this section. See `./schema`. */
              scaffolded: z.boolean().optional(),
            })
            .strict(),
        ),
      })
      .strict(),
    findings: z.array(storedFinding).min(1).optional(),
    /** One entry per path any fence names. */
    sources: z.record(z.string(), resolvedSource),
  })
  .strict()
  .superRefine((doc, ctx) => {
    /*
     * Every path a fence names has an entry.
     *
     * The renderer reads `sources[path]` without testing for it: a missing
     * entry would be an undefined `at` reaching a permalink, and a file drawn
     * with no marks at all, neither of which announces itself.
     */
    for (const path of fencePaths(doc)) {
      if (doc.sources[path] !== undefined) continue
      ctx.addIssue({
        code: "custom",
        path: ["sources", path],
        message: `no resolved source for \`${path}\`, which a fence names`,
      })
    }
  })

export type StoredDocument = z.output<typeof storedDocument>

/**
 * A stored document read from its file text, or null when the text is not
 * JSON or not a valid stored document. Every reader of a stored file (the
 * extension, the server's API, the renderer) goes through this.
 */
export function parseStoredDocument(text: string): StoredDocument | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  const parsed = storedDocument.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * Every path a diagram node names as its source, deduplicated.
 *
 * Nothing when the diagram is `absent` or does not check. The fences' own
 * paths are `fencePaths`; these are the files a context node points at, which
 * no waypoint may mention.
 */
export function diagramPaths(doc: StoredDocument): string[] {
  const seen = new Set<string>()
  for (const node of checkDiagram(doc.diagram).diagram?.nodes ?? []) {
    for (const source of node.sources ?? []) seen.add(source.path)
  }
  return [...seen]
}
