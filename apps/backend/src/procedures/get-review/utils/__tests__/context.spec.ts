import { buildContext } from "@/procedures/get-review/utils/context"
import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { prepareWalkthrough, type ReviewViewContext } from "@flightplan/codegraph"
import type { Segment } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"

const REVIEW_VIEW: ReviewViewContext = {
  sources: [],
  solutionTokens: new Map(),
  knownLinkIds: new Set(),
  definitionIds: new Set(),
  blobLinkOf: () => null,
  spotlight: [],
  walkthroughOrder: "imports-bottom-up",
  isWriting: false,
}

const contextOf = (segment: Segment) =>
  buildContext(prepareWalkthrough(segment, NO_REVIEWED_MARKS, { filterKeys: [], isShowingReviewed: true }, REVIEW_VIEW), "segment-1-", REVIEW_VIEW)

describe("buildContext", () => {
  it("reads a tabs block of the context as tabs", () => {
    const segment = { ...DRAFT_ARTIFACT.segments[0], context: "This segment adds a page.\n\n:::tabs\n::tab What's added\n- A page.\n:::" }

    expect(contextOf(segment).context).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "text", text: "This segment adds a page." }] },
      { kind: "tabs", tabs: [{ label: "What's added", blocks: [{ kind: "list", isOrdered: false, items: [{ inlines: [{ kind: "text", text: "A page." }], blocks: [] }] }] }] },
    ])
  })

  it("reads an accordion block of the context as sections", () => {
    const segment = { ...DRAFT_ARTIFACT.segments[0], context: ":::accordion\n::section What's added\nA page.\n:::" }

    expect(contextOf(segment).context).toStrictEqual([
      { kind: "accordion", sections: [{ label: "What's added", blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "A page." }] }] }] },
    ])
  })
})
