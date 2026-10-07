import type { Finding, JourneyFlow, ReviewArtifact, SourceFile, TokenLine, Waypoint } from "@flightplan/configurations"
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

interface FrameText {
  readonly path: string
  readonly text: string
  readonly language: string
}

const FRAME_KEY_SEPARATOR = "\n"

export const frameTokenKeyOf = (path: string, text: string): string => [path, text].join(FRAME_KEY_SEPARATOR)

const frameTextsOf = (journey: JourneyFlow): Omit<FrameText, "language">[] => {
  const pathById = new Map(journey.nodes.flatMap((node) => (node.kind === "declaration" ? [[node.id, node.path] as const] : [])))
  const ofNodes = journey.nodes.flatMap((node) =>
    node.kind === "declaration" ? node.frameLines.map(({ text }) => ({ path: node.path, text })) : [])
  const ofEdges = journey.edges.flatMap((edge) => {
    const path = pathById.get(edge.from) ?? pathById.get(edge.to)
    return path === undefined ? [] : edge.frameLines.map(({ text }) => ({ path, text }))
  })
  return [...ofNodes, ...ofEdges]
}

const frameTextsIn = (artifact: ReviewArtifact): FrameText[] => {
  const frameTexts = artifact.segments
    .flatMap((segment) => (segment.journey === null ? [] : frameTextsOf(segment.journey)))
    .map(({ path, text }) => ({ path, text, language: languageOf(artifact.sources, path) }))
  const keys = frameTexts.map(({ path, text }) => frameTokenKeyOf(path, text))
  return frameTexts.filter((_frameText, position) => keys.indexOf(keys[position]) === position)
}

export interface HighlightedReview {
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly frameTokens: ReadonlyMap<string, TokenLine>
}

export const highlightReview = async (
  artifact: ReviewArtifact,
  highlightCode: CodeHighlighter,
): Promise<HighlightedReview> => {
  const [sources, solutions, frames] = await Promise.all([
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
    Promise.all(
      frameTextsIn(artifact).map(async ({ path, text, language }) =>
        [frameTokenKeyOf(path, text), (await highlightCode([text], language)).flat()] as const),
    ),
  ])
  return { sources, solutionTokens: new Map(solutions), frameTokens: new Map(frames) }
}
