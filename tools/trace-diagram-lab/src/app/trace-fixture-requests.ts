import { queryOptions, skipToken } from "@tanstack/react-query"
import type { z } from "zod"
import { TRACE_FIXTURES_PATH, traceFixturePathOf } from "@/server/trace-fixture-api"
import { failureBodySchema, traceFixtureEntriesSchema, traceFixturePageSchema, type TraceFixtureEntry, type TraceFixturePage } from "./trace-fixture-schemas"

const failureMessageOf = (status: number, body: unknown): string => {
  const failure = failureBodySchema.safeParse(body)
  return failure.success ? failure.data.message : `The lab server answered ${String(status)}.`
}

export const fetchJson = async <Value>(path: string, schema: z.ZodType<Value>): Promise<Value> => {
  const response = await fetch(path)
  const body: unknown = await response.json()
  if (!response.ok) throw new Error(failureMessageOf(response.status, body))
  return schema.parse(body)
}

export const fetchTraceFixtures = async (): Promise<readonly TraceFixtureEntry[]> =>
  await fetchJson(TRACE_FIXTURES_PATH, traceFixtureEntriesSchema)

export const fetchTraceFixturePage = async (id: string): Promise<TraceFixturePage> =>
  await fetchJson(traceFixturePathOf(id), traceFixturePageSchema)

const TRACE_FIXTURES_KEY = "trace-fixtures"
const TRACE_FIXTURE_KEY = "trace-fixture"

export const traceFixturesQuery = queryOptions({ queryKey: [TRACE_FIXTURES_KEY], queryFn: fetchTraceFixtures })

export const traceFixturePageQueryOf = (id: string | null) =>
  queryOptions({
    queryKey: [TRACE_FIXTURE_KEY, id],
    queryFn: id === null ? skipToken : async () => await fetchTraceFixturePage(id),
  })
