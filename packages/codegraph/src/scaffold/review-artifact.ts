import type { FileCodeReferences } from "@/code-references"
import { firstOfEach } from "@/shared/first-of-each"
import { listTraceNodes } from "@/trace-diagram"
import type {
  Blast,
  CodeExport,
  CodeReference,
  DiffType,
  FileSection,
  TraceDiagram,
  LanguageReference,
  LineRange,
  ReviewArtifact,
  Segment,
  SourceFile,
  Waypoint,
} from "@flightplan/configurations"
import { listContextCodeBlocks } from "./context-code-blocks"
import type { Hunk, HunksByPath } from "./hunks"
import { buildSourceLines } from "./source-lines"

export interface RangedWaypoint extends Waypoint {
  readonly range: LineRange
  readonly children: readonly RangedWaypoint[]
}

export interface RangedFileSection extends FileSection {
  readonly waypoints: readonly RangedWaypoint[]
}

export interface SegmentFile {
  readonly filePath: string
  readonly diffType: DiffType | null
}

export interface SegmentParts {
  readonly id: string
  readonly title: string | null
  readonly context: string
  readonly importGraph: readonly SegmentFile[]
  readonly traceDiagram: TraceDiagram | null
  readonly blastDiagram: Blast | null
  readonly walkthrough: { readonly files: readonly RangedFileSection[] }
  readonly codeReferences: readonly FileCodeReferences[]
}

export interface ReviewArtifactParts {
  readonly title: string
  readonly status: ReviewArtifact["status"]
  readonly commit: string
  readonly hunks: HunksByPath
  readonly textOf: (path: string) => string | null
  readonly segments: readonly SegmentParts[]
}

const LANGUAGE_BY_EXTENSION: ReadonlyMap<string, string> = new Map(Object.entries({
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  kt: "kotlin",
  cs: "csharp",
  sh: "shellscript",
  yml: "yaml",
  md: "markdown",
}))

const PLAIN_TEXT_LANGUAGE = "text"
const SEGMENT_ID_LENGTH = 8
const EXTENSION_SEPARATOR = "."
const UNTITLED_SEGMENT = ""
const NO_CHANGE: Hunk = { added: [], removed: [], isCreated: false }

export const languageOf = (path: string): string => {
  const separatorIndex = path.lastIndexOf(EXTENSION_SEPARATOR)
  if (separatorIndex <= 0 || separatorIndex === path.length - 1) return PLAIN_TEXT_LANGUAGE
  const extension = path.slice(separatorIndex + 1).toLowerCase()
  return LANGUAGE_BY_EXTENSION.get(extension) ?? extension
}

export const segmentIdOf = (uuid: string): string => uuid.replaceAll("-", "").slice(0, SEGMENT_ID_LENGTH)

const inOrder = (paths: readonly string[]): string[] => [...paths].sort((one, two) => one.localeCompare(two))

const toWaypoint = (waypoint: RangedWaypoint): Waypoint => ({
  id: waypoint.id,
  title: waypoint.title,
  declaration: waypoint.declaration,
  codeBlocks: waypoint.codeBlocks,
  reading: waypoint.reading,
  needsAttention: waypoint.needsAttention,
  findings: waypoint.findings,
  children: waypoint.children.map(toWaypoint),
})

const listWaypoints = (waypoints: readonly RangedWaypoint[]): RangedWaypoint[] =>
  waypoints.flatMap((waypoint) => [waypoint, ...listWaypoints(waypoint.children)])

const toSegment = (parts: SegmentParts): Segment => ({
  id: parts.id,
  title: parts.title ?? UNTITLED_SEGMENT,
  changedPaths: inOrder(parts.importGraph.filter((file) => file.diffType !== null).map((file) => file.filePath)),
  context: parts.context,
  traceDiagram: parts.traceDiagram,
  blastDiagram: parts.blastDiagram,
  walkthrough: { files: parts.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(toWaypoint) })) },
})

const declarationsOf = (path: string, sections: readonly RangedFileSection[]): Record<string, LineRange> =>
  Object.fromEntries(
    sections
      .filter((section) => section.path === path)
      .flatMap((section) => listWaypoints(section.waypoints))
      .map((waypoint) => [waypoint.declaration, waypoint.range]),
  )

const referencesOf = (path: string, segments: readonly SegmentParts[]): CodeReference[] =>
  segments.flatMap((segment) => segment.codeReferences.filter((file) => file.path === path).flatMap((file) => file.references))

const languageReferencesOf = (path: string, segments: readonly SegmentParts[]): LanguageReference[] =>
  segments.flatMap((segment) => segment.codeReferences.filter((file) => file.path === path).flatMap((file) => file.languageReferences))

const exportPlaceOf = ({ line, startColumn }: CodeExport): string => `${String(line)}:${String(startColumn)}`

const exportsOf = (path: string, segments: readonly SegmentParts[]): CodeExport[] =>
  firstOfEach(segments.flatMap((segment) => segment.codeReferences.filter((file) => file.path === path).flatMap((file) => file.exports)), exportPlaceOf)

const listViewedPaths = (segments: readonly SegmentParts[]): string[] => [
  ...segments.flatMap((segment) => listTraceNodes(segment.traceDiagram?.traceNodes ?? []).map((node) => node.codeBlocks[0].astGraph.filePath)),
  ...segments.flatMap((segment) => segment.codeReferences.flatMap((file) => file.references.map((reference) => reference.path))),
  ...listContextCodeBlocks(segments).flatMap((listed) => (listed.codeBlock === null ? [] : [listed.codeBlock.astGraph.filePath])),
]

export const listSourcePaths = (hunks: HunksByPath, segments: readonly SegmentParts[]): string[] => [
  ...new Set([...inOrder(Object.keys(hunks)), ...inOrder(listViewedPaths(segments))]),
]

const toSourceFile = (path: string, { hunks, textOf, segments }: ReviewArtifactParts): SourceFile[] => {
  const hunk = new Map(Object.entries(hunks)).get(path)
  const text = textOf(path)
  if (hunk === undefined && text === null) return []
  return [
    {
      path,
      language: languageOf(path),
      lines: buildSourceLines(text, hunk ?? NO_CHANGE),
      declarations: declarationsOf(path, segments.flatMap((segment) => segment.walkthrough.files)),
      references: referencesOf(path, segments),
      languageReferences: languageReferencesOf(path, segments),
      exports: exportsOf(path, segments),
    },
  ]
}

export const assembleReviewArtifact = (parts: ReviewArtifactParts): ReviewArtifact => ({
  title: parts.title,
  status: parts.status,
  commit: parts.commit,
  isSegmented: parts.segments.length > 1,
  segments: parts.segments.map(toSegment),
  sources: listSourcePaths(parts.hunks, parts.segments).flatMap((path) => toSourceFile(path, parts)),
  contextCodeBlocks: listContextCodeBlocks(parts.segments),
  changedPaths: inOrder(Object.keys(parts.hunks)),
})
