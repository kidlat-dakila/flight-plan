import { ASTCodeGroupGraph, type LineRange } from "@/ast-graph"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"
import type { DeclarationNode, JourneyFlow, JourneyNode, TracedLine, TracedName, TraceEnd } from "@flightplan/configurations"

export type Repository = Readonly<Record<string, readonly string[]>>

export type Aliases = Readonly<Record<string, string>>

const DIFF_MARK = " // diff"
const HEAD_COMMIT = "head-commit"
const IMPORT_SPECIFIER = /from "(?<specifier>[^"]+)"/gu
const RELATIVE_SPECIFIER = /^\.{1,2}\//u
const RESOLVED_SUFFIXES = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]
const PATH_SEPARATOR = "/"
const PARENT_FOLDER = ".."
const SAME_FOLDER = "."
const NO_ALIASES: Aliases = {}

const withoutMark = (line: string): string => (line.endsWith(DIFF_MARK) ? line.slice(0, -DIFF_MARK.length) : line)

const diffLinesOf = (lines: readonly string[]): LineRange[] =>
  lines.flatMap((line, index): LineRange[] => (line.endsWith(DIFF_MARK) ? [[index + 1, index + 1]] : []))

const joinPath = (folder: readonly string[], specifier: string): string =>
  specifier
    .split(PATH_SEPARATOR)
    .reduce<readonly string[]>((path, part) => {
      if (part === SAME_FOLDER) return path
      return part === PARENT_FOLDER ? path.slice(0, -1) : [...path, part]
    }, folder)
    .join(PATH_SEPARATOR)

const aliasedPath = (specifier: string, aliases: Aliases): string => {
  const prefix = Object.keys(aliases).find((alias) => specifier === alias || specifier.startsWith(alias))
  return prefix === undefined ? specifier : `${aliases[prefix]}${specifier.slice(prefix.length)}`
}

const resolveSpecifier = (filePath: string, specifier: string, repository: Repository, aliases: Aliases): string | null => {
  const base = RELATIVE_SPECIFIER.test(specifier)
    ? joinPath(filePath.split(PATH_SEPARATOR).slice(0, -1), specifier)
    : aliasedPath(specifier, aliases)
  const resolved = RESOLVED_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) => candidate in repository)
  return resolved ?? null
}

const importsOf = (filePath: string, source: string, repository: Repository, aliases: Aliases): Map<string, string> =>
  new Map(
    [...source.matchAll(IMPORT_SPECIFIER)].flatMap((match): [string, string][] => {
      const specifier = match.groups?.specifier ?? ""
      const resolved = resolveSpecifier(filePath, specifier, repository, aliases)
      return resolved === null ? [] : [[specifier, resolved]]
    }),
  )

export const journeyOf = (repository: Repository, aliases: Aliases = NO_ALIASES): JourneyFlow | null => {
  const sources = Object.entries(repository).map(([filePath, lines]) => {
    const source = lines.map(withoutMark).join("\n")
    const importedFilePaths = importsOf(filePath, source, repository, aliases)
    return {
      filePath,
      gitSha: HEAD_COMMIT,
      source,
      importedBy: [],
      importsTo: [...importedFilePaths.values()],
      importedFilePaths,
      diffLines: diffLinesOf(lines),
    }
  })
  return generateJourneyFlowDiagram(new ASTCodeGroupGraph(sources).astGraphFiles)
}

const nameOf = (node: JourneyNode): string => {
  if (node.kind === "entry-point") return `[${node.label}]`
  const name = node.declaration === "top level" ? `${node.path}, top level` : node.declaration
  return node.changeType === "diff" ? `${name} (changed)` : name
}

export const inPathOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => one.localeCompare(two))

export const pathsOf = (flow: JourneyFlow | null): string[] => {
  if (flow === null) return []
  const names = new Map(flow.nodes.map((node) => [node.id, nameOf(node)]))
  return inPathOrder(
    flow.edges.map(({ from, to, through }) => {
      const steps = through.length === 0 ? "" : ` through ${through.join(", ")}`
      return `${names.get(from) ?? from} → ${names.get(to) ?? to}${steps}`
    }),
  )
}

const describeTracedLines = (lines: readonly TracedLine[]): string[] =>
  lines.map(({ line, text, isChanged }) => `${String(line)}: ${text.trim()}${isChanged ? " (changed)" : ""}`)

export const tracedLinesOf = (flow: JourneyFlow | null, declaration: string): string[] => {
  const node = flow?.nodes.find((candidate) => candidate.kind === "declaration" && candidate.declaration === declaration)
  return node?.kind === "declaration" ? describeTracedLines(node.tracedLines) : []
}

export function edgeOf(flow: JourneyFlow | null, from: string, to: string): JourneyFlow["edges"][number] | undefined {
  const idOf = (declaration: string): string | undefined =>
    flow?.nodes.find((node) => node.kind === "declaration" && node.declaration === declaration)?.id
  return flow?.edges.find((edge) => edge.from === idOf(from) && edge.to === idOf(to))
}

export const categoriesOf = (flow: JourneyFlow | null): string[] =>
  inPathOrder((flow?.nodes ?? []).flatMap((node) => (node.kind === "declaration" ? [`${node.declaration}: ${node.category}`] : [])))

const describeTracedName = ({ name, changeType, reference: [startLine, endLine] }: TracedName): string =>
  `${name} @${startLine === endLine ? String(startLine) : `${String(startLine)}-${String(endLine)}`}${changeType === "none" ? "" : ` (${changeType})`}`

const declarationNamed = (flow: JourneyFlow | null, declaration: string): DeclarationNode | null => {
  const node = flow?.nodes.find((candidate) => candidate.kind === "declaration" && candidate.declaration === declaration)
  return node?.kind === "declaration" ? node : null
}

export const eventsOf = (flow: JourneyFlow | null, declaration: string): string[] =>
  (declarationNamed(flow, declaration)?.events ?? []).map(describeTracedName)

export const handlerNodesOf = (flow: JourneyFlow | null, declaration: string): string[] => {
  const handlerNameOf = (nodeId: string | null): string => {
    const handler = flow?.nodes.find((node) => node.id === nodeId)
    return handler?.kind === "declaration" ? handler.declaration : "none"
  }
  return (declarationNamed(flow, declaration)?.events ?? []).map((event) => `${event.name} @${String(event.reference[0])} → ${handlerNameOf(event.nodeId)}`)
}

export const dataOf = (flow: JourneyFlow | null, declaration: string): string[] =>
  (declarationNamed(flow, declaration)?.data ?? []).map(describeTracedName)

export const entryPointsOf = (flow: JourneyFlow | null): string[] =>
  (flow?.nodes ?? []).flatMap((node) => (node.kind === "entry-point" ? [`${node.trigger}: ${node.label}`] : []))

export const changing = (repository: Repository, changes: Readonly<Record<string, readonly string[]>>): Repository =>
  Object.fromEntries(
    Object.entries(repository).map(([filePath, lines]) => {
      const snippets = new Map(Object.entries(changes)).get(filePath) ?? []
      return [filePath, lines.map((line) => (snippets.some((snippet) => line.includes(snippet)) ? `${line}${DIFF_MARK}` : line))]
    }),
  )

export const adding = (repository: Repository, files: Repository): Repository => ({
  ...repository,
  ...Object.fromEntries(Object.entries(files).map(([filePath, lines]) => [filePath, lines.map((line) => `${line}${DIFF_MARK}`)])),
})

export const tracedLinesFromEntry = (flow: JourneyFlow | null, entryLabel: string): string[] => {
  const entry = flow?.nodes.find((node) => node.kind === "entry-point" && node.label === entryLabel)
  const triggered = flow?.edges.find((edge) => edge.from === entry?.id)
  const handler = flow?.nodes.find((node) => node.id === triggered?.to)
  return describeTracedLines(handler?.kind === "declaration" && handler.declaration.includes(".") ? handler.tracedLines : [])
}

export const traceEndOf = (flow: JourneyFlow | null, entryLabel: string): TraceEnd | null => {
  const entry = flow?.nodes.find((node) => node.kind === "entry-point" && node.label === entryLabel)
  return entry?.kind === "entry-point" ? entry.traceEnd : null
}
