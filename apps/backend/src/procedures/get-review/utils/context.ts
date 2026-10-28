import { buildChangeOverview, parseContextProse, type PreparedWalkthrough, type ReviewViewContext } from "@flightplan/codegraph"
import type { ContextBand } from "./schemas"

export const buildContext = (prepared: PreparedWalkthrough, scope: string, context: ReviewViewContext): ContextBand => {
  const { segment } = prepared
  return {
    anchorId: `${scope}context`,
    heading: "Context",
    context: parseContextProse(segment.context, context.knownLinkIds),
    markdown: segment.context,
    isDraft: segment.context.trim() === "",
    unwrittenLabel: "Not written yet.",
    changeOverview: { ...buildChangeOverview(prepared, context.blobLinkOf), anchorId: `${scope}change-overview` },
  }
}
