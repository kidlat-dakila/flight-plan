import type { ArtifactPart } from "./schemas"

const WHITESPACE_RUN = /\s+/gu

const placeOf = (part: ArtifactPart): string => {
  if (part.kind === "segment") return `segment \`${part.segmentId}\` of the review artifact`
  if (part.kind === "waypoint") return `waypoint \`${part.waypointId}\` of the review artifact`
  if (part.kind === "trace-diagram") return `the Trace Diagram of segment \`${part.segmentId}\``
  if (part.kind === "trace-node") return `Trace Diagram node \`${part.nodeId}\` of segment \`${part.segmentId}\``
  if (part.kind === "blast-node") return `Blast Diagram file \`${part.path}\` of segment \`${part.segmentId}\``
  if (part.kind === "context-code-block") return `context code block \`${part.blockId}\` of the review artifact`
  return "the review artifact"
}

const collapseWhitespace = (text: string): string => text.replace(WHITESPACE_RUN, " ").trim()

export const formatTextReference = (part: ArtifactPart, quote: string): string =>
  `${placeOf(part)}, where it says "${collapseWhitespace(quote)}"`
