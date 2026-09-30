import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"
import type { AppRouter } from "@flightplan/backend/router"

const TRPC_URL = "/api/trpc"

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export const createTrpcClient = () =>
  createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: TRPC_URL })] })
