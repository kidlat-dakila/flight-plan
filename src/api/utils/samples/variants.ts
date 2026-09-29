import { REPO, HEAD } from "./files"
import { walkthroughInput, type SampleInput } from "./walkthrough"

/**
 * The walkthroughs the full sample cannot be at the same time.
 *
 * `absent` has neither a diagram nor a blast radius, and says why. `drafting`
 * is the full walkthrough as it would look after each write an agent makes,
 * from the opening document `start` stores to the one `complete` accepts.
 */

export function absentInput(): SampleInput {
  const full = walkthroughInput()
  const hasStock = full.codeWalkthrough.files.find((file) => file.path === "src/checkout/hasStock.ts")
  return {
    schema: 1,
    // Filed by branch, the form a change reviewed with plain git takes.
    meta: { kind: "walkthrough", repo: REPO, at: { branch: "stock-check" }, head: HEAD, status: "complete" },
    title: "Count a missing stock row as none",
    contextBody: {
      context: "A product the warehouse never stocked passed the stock check. It now counts as out of stock.",
      overview: [{ when: "a product has no stock row", then: "the order is refused as out of stock" }],
      implementation: [
        {
          label: "src/checkout/hasStock.ts",
          path: "src/checkout/hasStock.ts",
          items: [{ text: "Defaulted a missing level to zero." }],
        },
      ],
    },
    diagram: { absent: "One comparison in one function: there is no flow to draw." },
    blast: { absent: "Nothing outside the check reads the level it defaults." },
    codeWalkthrough: { files: hasStock === undefined ? [] : [hasStock] },
  }
}

/** A card as the scaffold writes it: its own name for a title, and no prose. */
function scaffolded(point: unknown): unknown {
  const card = point as {
    code: { target?: { symbol?: string; focus?: [number, number] } } | null
    children?: unknown[]
  } & Record<string, unknown>
  const target = card.code?.target
  const title =
    target?.symbol !== undefined
      ? `${target.symbol}()`
      : target?.focus !== undefined
        ? `Lines ${String(target.focus[0])}–${String(target.focus[1])}`
        : card["title"]
  const { needsAttention: _later, findings: _laterToo, ...rest } = card
  return {
    ...rest,
    title,
    draft: true,
    reading: null,
    ...(card.children === undefined ? {} : { children: card.children.map(scaffolded) }),
  }
}

/**
 * The writes, in the order the review skill makes them.
 *
 * Each entry is what the document holds after that write. The last one is the
 * full walkthrough, marked complete.
 */
const STEPS: ((full: SampleInput) => SampleInput)[] = [
  // `start`: the title and the context, which a reader can act on soonest.
  (full) => ({
    schema: 1,
    meta: { ...full.meta, status: "drafting" },
    title: full.title,
    contextBody: { context: full.contextBody.context },
    diagram: { absent: "Not drawn yet." },
    codeWalkthrough: { files: [] },
  }),
  // The overview and the implementation list.
  (full) => ({
    ...STEPS[0]!(full),
    contextBody: full.contextBody,
  }),
  /*
   * The scaffold: every card exists, titled with its code and unwritten —
   * except the last file's, whose section is there before its cards are. A
   * file section with no waypoints exists only while a document is drafted
   * (`checkComplete` refuses one in a complete document), and the panel still
   * lists it, with its path.
   */
  (full) => ({
    ...STEPS[1]!(full),
    codeWalkthrough: {
      files: full.codeWalkthrough.files.map((file, index, all) => ({
        ...file,
        waypoints: index === all.length - 1 ? [] : file.waypoints.map(scaffolded),
        scaffolded: true,
      })),
    },
  }),
  // Half the files written.
  (full) => {
    const files = full.codeWalkthrough.files
    const half = Math.ceil(files.length / 2)
    return {
      ...STEPS[1]!(full),
      codeWalkthrough: {
        files: files.map((file, index) =>
          index < half
            ? { ...file, scaffolded: true }
            : { ...file, waypoints: file.waypoints.map(scaffolded), scaffolded: true },
        ),
      },
    }
  },
  // Every card written.
  (full) => ({
    ...STEPS[1]!(full),
    codeWalkthrough: {
      files: full.codeWalkthrough.files.map((file) => ({ ...file, scaffolded: true })),
    },
  }),
  // The diagram.
  (full) => ({ ...STEPS[4]!(full), diagram: full.diagram }),
  // The blast radius.
  (full) => ({ ...STEPS[5]!(full), blast: full.blast }),
  // The findings and the note, and `complete`: the full walkthrough.
  (full) => full,
]

export const DRAFTING_STEPS = STEPS.length

/** The walkthrough after `step` writes, clamped to the first and the last. */
export function draftingInput(step: number): SampleInput {
  const index = Math.max(0, Math.min(STEPS.length - 1, Math.floor(step)))
  return STEPS[index]!(walkthroughInput())
}
