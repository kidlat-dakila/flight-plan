import type { QueryClient } from "@tanstack/react-query"
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import type { AppRouter } from "@flightplan/backend/router"

export interface RouterContext {
  readonly queryClient: QueryClient
  readonly trpc: TRPCOptionsProxy<AppRouter>
}
