import type { TraceFixtureEntry } from "@/fixtures"
import type { TracePage } from "@flightplan/codegraph"

export const TRACE_FIXTURES_PATH = "/api/trace-fixtures"

export interface TraceFixturePage {
  readonly entry: TraceFixtureEntry
  readonly page: TracePage
}

export interface TraceFixtureLoader {
  readonly listTraceFixtures: () => Promise<readonly TraceFixtureEntry[]>
  readonly readTraceFixturePage: (id: string) => Promise<TraceFixturePage | null>
}

export const traceFixturePathOf = (id: string): string => `${TRACE_FIXTURES_PATH}/${id.split("/").map(encodeURIComponent).join("/")}`
