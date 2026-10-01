import type { TokenLine } from "./code/highlighter"
import type { HighlightedSource } from "./code/lines"
import type { ForgeLocation } from "./forge-links"
import { parseProse } from "./parse-prose"
import type { Segment } from "./review-artifact"
import type { ContextBand } from "./schemas"

export interface ReviewViewContext {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly knownLinkIds: ReadonlySet<string>
  readonly forgeLocation: ForgeLocation
}

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
