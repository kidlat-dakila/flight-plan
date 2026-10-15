import { languageOf } from "@/scaffold/review-artifact"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeUsage, Finding, ReviewArtifact, SourceFile, TokenLine, Waypoint } from "@flightplan/configurations"
import type { CodeHighlighter } from "./highlighter"
import { usageLineKeyOf, type HighlightedSource } from "./lines"

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

const languageIn = (sources: readonly SourceFile[], path: string): string =>
  sources.find((source) => source.path === path)?.language ?? PLAIN_TEXT_LANGUAGE

const solutionsIn = (artifact: ReviewArtifact): Solution[] => [
  ...artifact.segments.flatMap((segment) =>
    segment.walkthrough.files.flatMap((file) =>
      file.waypoints.flatMap((waypoint) => waypointSolutions(waypoint, languageIn(artifact.sources, file.path))))),
]

const listUsageLines = (source: SourceFile): CodeUsage[] =>
  firstOfEach(source.exports.flatMap((exported) => exported.usages), usageLineKeyOf)

const highlightUsageLines = async (source: SourceFile, highlightCode: CodeHighlighter): Promise<ReadonlyMap<string, TokenLine>> => {
  const usages = listUsageLines(source)
  const languages = [...new Set(usages.map((usage) => languageOf(usage.path)))]
  const highlighted = await Promise.all(
    languages.map(async (language) => {
      const written = usages.filter((usage) => languageOf(usage.path) === language)
      const tokenLines = await highlightCode(written.map((usage) => usage.text), language)
      return written.map((usage, index) => [usageLineKeyOf(usage), tokenLines[index] ?? []] as const)
    }),
  )
  return new Map(highlighted.flat())
}

const highlightSource = async (source: SourceFile, highlightCode: CodeHighlighter): Promise<HighlightedSource> => {
  const [tokenLines, usageTokenLines] = await Promise.all([
    highlightCode(source.lines.map((line) => line.text), source.language),
    highlightUsageLines(source, highlightCode),
  ])
  return { source, tokenLines, usageTokenLines }
}

export interface HighlightedReview {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
}

export const highlightReview = async (
  artifact: ReviewArtifact,
  highlightCode: CodeHighlighter,
): Promise<HighlightedReview> => {
  const [sources, solutions] = await Promise.all([
    Promise.all(artifact.sources.map(async (source) => await highlightSource(source, highlightCode))),
    Promise.all(
      solutionsIn(artifact).map(async (solution) =>
        [solution.findingId, await highlightCode(solution.text.split("\n"), solution.language)] as const),
    ),
  ])
  return { sources, solutionTokens: new Map(solutions) }
}
