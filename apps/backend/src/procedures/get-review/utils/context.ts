import { parseContextProse, type ReviewViewContext } from "@flightplan/codegraph"
import type { Segment } from "@flightplan/configurations"
import type { ContextBand } from "./schemas"

export const buildContext = (segment: Segment, scope: string, context: ReviewViewContext): ContextBand => ({
  anchorId: `${scope}context`,
  heading: "Context",
  context: parseContextProse(segment.context, context.knownLinkIds),
  markdown: segment.context,
  isDraft: segment.context.trim() === "",
  unwrittenLabel: "Not written yet.",
})
