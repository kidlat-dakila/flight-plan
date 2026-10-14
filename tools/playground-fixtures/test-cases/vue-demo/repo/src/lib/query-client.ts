import { QueryClient } from "@tanstack/vue-query"

const STALE_TIME_MS = 30_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: STALE_TIME_MS, retry: false },
  },
})
