import { rangeOfDeclaration } from "@/procedures/read-artifact/utils/covered-code"
import { codeLinkIdsIn } from "@flightplan/codegraph"
import type { SourceFile } from "@flightplan/configurations"

const TARGET_SEPARATOR = "#"
const LINES_TARGET_PATTERN = /^L(\d+)(?:-L?(\d+))?$/
const DECIMAL = 10

const hasLine = (source: SourceFile, lineNumber: number): boolean => source.lines.some((line) => line.number === lineNumber)

const isLinesTargetInside = (source: SourceFile, target: string): boolean => {
  const match = LINES_TARGET_PATTERN.exec(target)
  if (match === null) return false
  const lineNumbers = match.slice(1).filter((digits) => typeof digits === "string").map((digits) => Number.parseInt(digits, DECIMAL))
  return lineNumbers.every((lineNumber) => hasLine(source, lineNumber))
}

const isResolvable = (sources: readonly SourceFile[], linkId: string): boolean => {
  const separatorIndex = linkId.lastIndexOf(TARGET_SEPARATOR)
  if (separatorIndex < 0) return false
  const source = sources.find((candidate) => candidate.path === linkId.slice(0, separatorIndex))
  const target = linkId.slice(separatorIndex + 1)
  return source !== undefined && (rangeOfDeclaration(source, target) !== null || isLinesTargetInside(source, target))
}

export const unresolvedLinkIdsIn = (texts: readonly string[], sources: readonly SourceFile[]): string[] =>
  codeLinkIdsIn(texts).filter((linkId) => !isResolvable(sources, linkId))

export const linkProblemOf = (texts: readonly string[], sources: readonly SourceFile[]): string | null => {
  const unresolved = unresolvedLinkIdsIn(texts, sources)
  return unresolved.length === 0
    ? null
    : `${unresolved.length === 1 ? "This code link does" : "These code links do"} not resolve: ${unresolved.map((linkId) => `\`code:${linkId}\``).join(", ")}. A link names a file the artifact holds and one of its declarations, or lines inside it; read the overview for \`sources\`. Name any other code in backticks with its path.`
}
