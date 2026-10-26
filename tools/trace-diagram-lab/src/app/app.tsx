import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { chosenDiagramOf, listFixtureDiagrams } from "./fixture-diagrams"
import LabBand from "./lab-band"
import { chosenOf, diagramOptionsOf, fixtureOptionsOf, labSelectionOfSearch, nextIdOf, previousIdOf, searchOfLabSelection, type LabSelection } from "./lab-selection"
import { labStatusOf } from "./lab-status"
import LabToolbar from "./lab-toolbar"
import { traceFixturePageQueryOf, traceFixturesQuery } from "./trace-fixture-requests"
import type { TraceFixtureEntry, TracePageSegment } from "./trace-fixture-schemas"

const NO_ENTRIES: readonly TraceFixtureEntry[] = []
const NO_SEGMENTS: readonly TracePageSegment[] = []

const readSelection = (): LabSelection => labSelectionOfSearch(window.location.search)

const writeSelection = (selection: LabSelection): void => {
  window.history.replaceState(null, "", `${window.location.pathname}${searchOfLabSelection(selection)}`)
}

const App = () => {
  const [selection, setSelection] = useState<LabSelection>(readSelection)
  const fixtures = useQuery(traceFixturesQuery)
  const entries = fixtures.data ?? NO_ENTRIES
  const entry = chosenOf(entries, selection.fixtureId)
  const fixturePage = useQuery(traceFixturePageQueryOf(entry?.id ?? null))
  const page = fixturePage.data?.page ?? null
  const segments = page?.segments ?? NO_SEGMENTS
  const diagrams = page === null ? [] : listFixtureDiagrams(page)
  const diagram = chosenDiagramOf(diagrams, selection.segmentId, selection.tabId)
  const segment = diagram === null ? null : chosenOf(segments, diagram.segmentId)
  const choose = (nextSelection: LabSelection): void => {
    setSelection(nextSelection)
    writeSelection(nextSelection)
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[90rem] px-6 pt-4 pb-24">
        {entry === null || page === null || segment === null || diagram === null
          ? null
          : <LabBand key={`${entry.id}#${diagram.id}`} fixtureId={entry.id} diagramId={diagram.id} page={page} segment={segment} tabId={diagram.tabId} />}
      </main>
      <LabToolbar
        fixtureOptions={fixtureOptionsOf(entries)}
        fixtureId={entry?.id ?? null}
        previousFixtureId={previousIdOf(entries, entry?.id ?? null)}
        nextFixtureId={nextIdOf(entries, entry?.id ?? null)}
        diagramOptions={diagramOptionsOf(diagrams)}
        diagramId={diagram?.id ?? null}
        statusMessage={labStatusOf({
          fixtures: { isLoading: fixtures.isLoading, error: fixtures.error },
          fixtureCount: fixtures.data?.length ?? null,
          page: { isLoading: fixturePage.isLoading, error: fixturePage.error },
          segmentCount: page?.segments.length ?? null,
        })}
        onFixtureChange={(fixtureId) => { choose({ fixtureId, segmentId: null, tabId: null }) }}
        onDiagramChange={(diagramId) => {
          const chosen = diagrams.find((candidate) => candidate.id === diagramId) ?? null
          choose({ fixtureId: entry?.id ?? null, segmentId: chosen?.segmentId ?? null, tabId: chosen?.tabId ?? null })
        }}
      />
    </div>
  )
}

export default App
