import type { AppRouter } from "@flight-plan/api"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"

const TRPC_URL = "/api/trpc"

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export const createTrpcClient = () =>
  createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: TRPC_URL })] })
