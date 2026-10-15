import { buildContext } from "@/procedures/get-review/utils/context"
import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import type { ReviewViewContext } from "@flightplan/codegraph"

const REVIEW_VIEW: ReviewViewContext = {
  sources: [],
  solutionTokens: new Map(),
  knownLinkIds: new Set(),
  definitionIds: new Set(),
  blobLinkOf: () => null,
}

describe("buildContext", () => {
  it("reads a tabs block of the context as tabs", () => {
    const segment = { ...DRAFT_ARTIFACT.segments[0], context: "This segment adds a page.\n\n:::tabs\n::tab What's added\n- A page.\n:::" }

    expect(buildContext(segment, "segment-1-", REVIEW_VIEW).context).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "text", text: "This segment adds a page." }] },
      { kind: "tabs", tabs: [{ label: "What's added", blocks: [{ kind: "list", isOrdered: false, items: [{ inlines: [{ kind: "text", text: "A page." }], blocks: [] }] }] }] },
    ])
  })

  it("reads an accordion block of the context as sections", () => {
    const segment = { ...DRAFT_ARTIFACT.segments[0], context: ":::accordion\n::section What's added\nA page.\n:::" }

    expect(buildContext(segment, "segment-1-", REVIEW_VIEW).context).toStrictEqual([
      { kind: "accordion", sections: [{ label: "What's added", blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "A page." }] }] }] },
    ])
  })
})
