import type { PlaygroundEntry, TraceFixtureEntry } from "@/fixtures"
import type { TracePage } from "@flightplan/codegraph"

export const TRACE_FIXTURES_PATH = "/api/trace-fixtures"

export const PLAYGROUNDS_PATH = "/api/playgrounds"

export interface TraceFixturePage {
  readonly entry: TraceFixtureEntry
  readonly page: TracePage
}

export interface PlaygroundCasePage {
  readonly id: string
  readonly title: string
  readonly caseTitle: string
  readonly page: TracePage
}

export interface PlaygroundPage {
  readonly entry: PlaygroundEntry
  readonly cases: readonly PlaygroundCasePage[]
}

export interface TraceFixtureLoader {
  readonly listTraceFixtures: () => Promise<readonly TraceFixtureEntry[]>
  readonly readTraceFixturePage: (id: string) => Promise<TraceFixturePage | null>
  readonly listPlaygrounds: () => Promise<readonly PlaygroundEntry[]>
  readonly readPlaygroundPage: (id: string) => Promise<PlaygroundPage | null>
}

const ID_SEPARATOR = "/"

const itemPathOf = (collectionPath: string, id: string): string => `${collectionPath}/${id.split(ID_SEPARATOR).map(encodeURIComponent).join(ID_SEPARATOR)}`

export const traceFixturePathOf = (id: string): string => itemPathOf(TRACE_FIXTURES_PATH, id)

export const playgroundPathOf = (id: string): string => itemPathOf(PLAYGROUNDS_PATH, id)
