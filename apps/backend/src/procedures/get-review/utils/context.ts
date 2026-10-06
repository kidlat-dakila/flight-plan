import { parseProse, type ReviewViewContext } from "@flightplan/codegraph"
import type { Segment } from "@flightplan/configurations"
import type { ContextBand } from "./schemas"

export const buildContext = (segment: Segment, scope: string, context: ReviewViewContext): ContextBand => ({
  anchorId: `${scope}context`,
  heading: "Context",
  context: parseProse(segment.context, context.knownLinkIds),
})
