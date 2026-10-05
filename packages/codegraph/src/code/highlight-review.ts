import type { Finding, ReviewArtifact, SourceFile, TokenLine, Waypoint } from "@flightplan/configurations"
import type { CodeHighlighter } from "./highlighter"
import type { HighlightedSource } from "./lines"

const PLAIN_TEXT_LANGUAGE = "text"

interface Solution {
  readonly findingId: string
  readonly text: string
  readonly language: string
}

const toSolutions = (findings: readonly Finding[], language: string): Solution[] =>
  findings.flatMap((finding) =>
    finding.solution === null ? [] : [{ findingId: finding.id, text: finding.solution, language }])

const waypointSolutions = (waypoint: Waypoint, language: string): Solution[] => [
  ...toSolutions(waypoint.findings, language),
  ...waypoint.children.flatMap((child) => waypointSolutions(child, language)),
]

const languageOf = (sources: readonly SourceFile[], path: string): string =>
  sources.find((source) => source.path === path)?.language ?? PLAIN_TEXT_LANGUAGE

const solutionsIn = (artifact: ReviewArtifact): Solution[] => [
  ...artifact.segments.flatMap((segment) =>
    segment.walkthrough.files.flatMap((file) =>
      file.waypoints.flatMap((waypoint) => waypointSolutions(waypoint, languageOf(artifact.sources, file.path))))),
]

export interface HighlightedReview {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
}

export const highlightReview = async (
  artifact: ReviewArtifact,
  highlightCode: CodeHighlighter,
): Promise<HighlightedReview> => {
  const [sources, solutions] = await Promise.all([
    Promise.all(
      artifact.sources.map(async (source) => ({
        source,
        tokenLines: await highlightCode(source.lines.map((line) => line.text), source.language),
      })),
    ),
    Promise.all(
      solutionsIn(artifact).map(async (solution) =>
        [solution.findingId, await highlightCode(solution.text.split("\n"), solution.language)] as const),
    ),
  ])
  return { sources, solutionTokens: new Map(solutions) }
}
