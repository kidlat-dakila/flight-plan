import { parseProse, type ReviewViewContext } from "@flightplan/codegraph"
import type { Segment } from "@flightplan/configurations"
import type { ContextBand } from "./schemas"

export const buildContext = (segment: Segment, scope: string, context: ReviewViewContext): ContextBand => ({
  anchorId: `${scope}context`,
  heading: "Context",
  context: parseProse(segment.context.context, context.knownLinkIds),
  overviewHeading: "Overview",
  whenLabel: "When",
  thenLabel: "Then",
  scenarios: segment.context.overview.map((scenario) => ({
    when: parseProse(scenario.when, context.knownLinkIds),
    then: parseProse(scenario.then, context.knownLinkIds),
  })),
  implementationHeading: "Implementation",
  groups: segment.context.implementation.map((group) => ({
    label: group.label,
    items: group.items.map((item) => parseProse(item, context.knownLinkIds)),
  })),
})
