import { listTraceFixtures, readTraceFixture, TRACE_FIXTURE_FOLDERS, type TraceFixtureFolders } from "@/fixtures"
import { buildTracePage, createCodeHighlighter, DEFAULT_VIEW_PREFERENCES, highlightReview, type CodeHighlighter } from "@flightplan/codegraph"
import type { TraceFixtureLoader, TraceFixturePage } from "./trace-fixture-api"

const readTraceFixturePage = async (id: string, highlightCode: CodeHighlighter, folders: TraceFixtureFolders): Promise<TraceFixturePage | null> => {
  const [entries, artifact] = await Promise.all([listTraceFixtures(folders), readTraceFixture(id, folders)])
  const entry = entries.find((candidate) => candidate.id === id)
  if (entry === undefined || artifact === null) return null
  const highlighted = await highlightReview(artifact, highlightCode)
  return { entry, page: buildTracePage({ artifact, highlighted, preferences: DEFAULT_VIEW_PREFERENCES }) }
}

export const createTraceFixtureLoader = (
  highlightCode: CodeHighlighter = createCodeHighlighter(),
  folders: TraceFixtureFolders = TRACE_FIXTURE_FOLDERS,
): TraceFixtureLoader => ({
  listTraceFixtures: async () => await listTraceFixtures(folders),
  readTraceFixturePage: async (id) => await readTraceFixturePage(id, highlightCode, folders),
})

export const traceFixtureLoader = createTraceFixtureLoader()
