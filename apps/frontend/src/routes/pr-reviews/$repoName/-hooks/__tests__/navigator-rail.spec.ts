import { navigatorRailOf } from "@/routes/pr-reviews/$repoName/-hooks/navigator-rail"

const sectionOf = (anchorId: string, kind: string) => ({ anchorId, kind, label: anchorId, children: [] })

describe("navigatorRailOf", () => {
  it("leaves the Change Overview to the section rail and keeps every other stop in order", () => {
    const rail = {
      groups: [{
        anchorId: "segment-one",
        label: "One",
        detailLabel: null,
        sections: [sectionOf("one-context", "context"), sectionOf("one-change-overview", "changeOverview"), sectionOf("one-trace-diagram", "traceDiagram")],
      }],
      sections: [sectionOf("conversation", "conversation")],
    }

    const navigatorRail = navigatorRailOf(rail)

    expect(navigatorRail.groups[0].sections.map((section) => section.anchorId)).toStrictEqual(["one-context", "one-trace-diagram"])
    expect(navigatorRail.sections.map((section) => section.anchorId)).toStrictEqual(["conversation"])
  })
})
