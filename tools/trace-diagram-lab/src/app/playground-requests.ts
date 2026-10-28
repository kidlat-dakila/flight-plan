import { queryOptions, skipToken } from "@tanstack/react-query"
import { PLAYGROUNDS_PATH, playgroundPathOf } from "@/server/trace-fixture-api"
import { playgroundEntriesSchema, playgroundPageSchema, type PlaygroundEntry, type PlaygroundPage } from "./playground-schemas"
import { fetchJson } from "./trace-fixture-requests"

export const fetchPlaygrounds = async (): Promise<readonly PlaygroundEntry[]> =>
  await fetchJson(PLAYGROUNDS_PATH, playgroundEntriesSchema)

export const fetchPlaygroundPage = async (id: string): Promise<PlaygroundPage> =>
  await fetchJson(playgroundPathOf(id), playgroundPageSchema)

const PLAYGROUNDS_KEY = "playgrounds"
const PLAYGROUND_KEY = "playground"

export const playgroundsQuery = queryOptions({ queryKey: [PLAYGROUNDS_KEY], queryFn: fetchPlaygrounds })

export const playgroundPageQueryOf = (id: string | null) =>
  queryOptions({
    queryKey: [PLAYGROUND_KEY, id],
    queryFn: id === null ? skipToken : async () => await fetchPlaygroundPage(id),
  })
