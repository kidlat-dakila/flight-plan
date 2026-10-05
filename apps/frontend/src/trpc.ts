import type { QueryClient } from "@tanstack/react-query"
import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
  type TRPCClient,
  type TRPCLink,
} from "@trpc/client"
import { createTRPCContext, createTRPCOptionsProxy, type TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import type { AppRouter } from "@flightplan/backend/router"

const TRPC_URL = "/api/trpc"

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export const backendLinks = (): TRPCLink<AppRouter>[] => [
  splitLink({
    condition: (operation) => operation.type === "subscription",
    true: httpSubscriptionLink({ url: TRPC_URL }),
    false: httpBatchLink({ url: TRPC_URL }),
  }),
]

export const createTrpcClient = (links: TRPCLink<AppRouter>[]): TRPCClient<AppRouter> =>
  createTRPCClient<AppRouter>({ links })

export const createTrpcOptions = (
  client: TRPCClient<AppRouter>,
  queryClient: QueryClient,
): TRPCOptionsProxy<AppRouter> => createTRPCOptionsProxy<AppRouter>({ client, queryClient })
