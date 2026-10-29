import { listPlaygrounds, listTraceFixtures, PLAYGROUNDS_FOLDER, readPlayground, readTraceFixture, TRACE_FIXTURE_FOLDERS, type PlaygroundCase, type TraceFixtureFolders } from "@/fixtures"
import { buildTracePage, createCodeHighlighter, DEFAULT_VIEW_PREFERENCES, highlightReview, type CodeHighlighter, type TracePage } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { PlaygroundCasePage, PlaygroundPage, TraceFixtureLoader, TraceFixturePage } from "./trace-fixture-api"

export interface LabFolders {
  readonly fixtures: TraceFixtureFolders
  readonly playgrounds: string
}

const LAB_FOLDERS: LabFolders = { fixtures: TRACE_FIXTURE_FOLDERS, playgrounds: PLAYGROUNDS_FOLDER }

const tracePageOf = async (artifact: ReviewArtifact, highlightCode: CodeHighlighter): Promise<TracePage> => {
  const highlighted = await highlightReview(artifact, highlightCode)
  return buildTracePage({ artifact, highlighted, preferences: DEFAULT_VIEW_PREFERENCES })
}

interface EntryPage<Entry> {
  readonly entry: Entry
  readonly page: TracePage
}

const entryPageOf = async <Entry extends { readonly id: string }>(
  id: string,
  [entries, artifact]: readonly [readonly Entry[], ReviewArtifact | null],
  highlightCode: CodeHighlighter,
): Promise<EntryPage<Entry> | null> => {
  const entry = entries.find((candidate) => candidate.id === id)
  if (entry === undefined || artifact === null) return null
  return { entry, page: await tracePageOf(artifact, highlightCode) }
}

const readTraceFixturePage = async (id: string, highlightCode: CodeHighlighter, folders: TraceFixtureFolders): Promise<TraceFixturePage | null> =>
  await entryPageOf(id, await Promise.all([listTraceFixtures(folders), readTraceFixture(id, folders)]), highlightCode)

const casePageOf = async ({ artifact, ...playgroundCase }: PlaygroundCase, highlightCode: CodeHighlighter): Promise<PlaygroundCasePage> =>
  ({ ...playgroundCase, page: await tracePageOf(artifact, highlightCode) })

const readPlaygroundPage = async (id: string, highlightCode: CodeHighlighter, playgroundsPath: string): Promise<PlaygroundPage | null> => {
  const [entries, cases] = await Promise.all([listPlaygrounds(playgroundsPath), readPlayground(id, playgroundsPath)])
  const entry = entries.find((candidate) => candidate.id === id)
  if (entry === undefined || cases === null) return null
  return { entry, cases: await Promise.all(cases.map(async (playgroundCase) => await casePageOf(playgroundCase, highlightCode))) }
}

export const createTraceFixtureLoader = (
  highlightCode: CodeHighlighter = createCodeHighlighter(),
  folders: LabFolders = LAB_FOLDERS,
): TraceFixtureLoader => ({
  listTraceFixtures: async () => await listTraceFixtures(folders.fixtures),
  readTraceFixturePage: async (id) => await readTraceFixturePage(id, highlightCode, folders.fixtures),
  listPlaygrounds: async () => await listPlaygrounds(folders.playgrounds),
  readPlaygroundPage: async (id) => await readPlaygroundPage(id, highlightCode, folders.playgrounds),
})

export const traceFixtureLoader = createTraceFixtureLoader()
