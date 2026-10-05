import type { ReviewArtifact, SourceFile } from "@flightplan/configurations"
import { readDeclarations } from "./declarations"
import type { Hunk, HunksByPath } from "./hunks"
import { scaffoldFiles, type ChangedFile, type ScaffoldedFile } from "./sections"
import { buildSourceLines } from "./source-lines"

export interface ChangeSnapshot {
  readonly title: string
  readonly headCommit: string
  readonly hunks: HunksByPath
  readonly texts: ReadonlyMap<string, string | null>
}

const TEST_PATH_PATTERN = /(?:^|[\\/])(?:__tests__|__mocks__|tests?|specs?|e2e|evals?)[\\/]|\.(?:test|spec|e2e|eval)\.[^./]+$/

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
const WHOLE_CHANGE_SEGMENT_ID = "all"
const JOURNEY_ABSENCE = "The Journey Flow Diagram is not built yet."
const BLAST_ABSENCE = "The Blast Diagram is not built yet."
const EXTENSION_SEPARATOR = "."

const isTestPath = (path: string): boolean => TEST_PATH_PATTERN.test(path)

export const languageOf = (path: string): string => {
  const separatorIndex = path.lastIndexOf(EXTENSION_SEPARATOR)
  if (separatorIndex <= 0 || separatorIndex === path.length - 1) return PLAIN_TEXT_LANGUAGE
  const extension = path.slice(separatorIndex + 1).toLowerCase()
  return LANGUAGE_BY_EXTENSION.get(extension) ?? extension
}

const toured = (paths: readonly string[]): readonly string[] => {
  const withoutTests = paths.filter((path) => !isTestPath(path))
  return withoutTests.length === 0 ? paths : withoutTests
}

const toChangedFile = (path: string, hunk: Hunk, text: string | null): ChangedFile => ({
  path,
  hunk,
  declarations: text === null ? null : readDeclarations(path, text),
})

const toSourceFile = (scaffolded: ScaffoldedFile, hunk: Hunk, text: string | null): SourceFile => ({
  path: scaffolded.section.path,
  language: languageOf(scaffolded.section.path),
  lines: buildSourceLines(text, hunk),
  declarations: scaffolded.anchors,
})

export const buildScaffold = (change: ChangeSnapshot): ReviewArtifact => {
  const changedPaths = Object.keys(change.hunks).sort((first, second) => first.localeCompare(second))
  const hunkByPath = new Map(Object.entries(change.hunks))
  const textOf = (path: string): string | null => change.texts.get(path) ?? null
  const files = toured(changedPaths).flatMap((path) => {
    const hunk = hunkByPath.get(path)
    return hunk === undefined ? [] : [toChangedFile(path, hunk, textOf(path))]
  })
  const scaffolded = scaffoldFiles(files)
  return {
    title: change.title,
    status: "drafting",
    commit: change.headCommit,
    isSegmented: false,
    segments: [
      {
        id: WHOLE_CHANGE_SEGMENT_ID,
        title: change.title,
        changedPaths,
        context: { context: "", overview: [], implementation: [] },
        journey: null,
        journeyAbsence: JOURNEY_ABSENCE,
        blast: null,
        blastAbsence: BLAST_ABSENCE,
        walkthrough: { intro: null, files: scaffolded.map((file) => file.section) },
      },
    ],
    sources: scaffolded.flatMap((file) => {
      const hunk = hunkByPath.get(file.section.path)
      return hunk === undefined ? [] : [toSourceFile(file, hunk, textOf(file.section.path))]
    }),
    changedPaths,
  }
}
