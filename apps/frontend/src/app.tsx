import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, type RouterHistory } from "@tanstack/react-router"
import type { TRPCClient } from "@trpc/client"
import type { AppRouter } from "@flightplan/backend/router"
import { createAppRouter } from "./router"
import { createTrpcOptions, TRPCProvider } from "./trpc"

interface AppDependencies {
  readonly queryClient: QueryClient
  readonly trpcClient: TRPCClient<AppRouter>
  readonly history?: RouterHistory
}

export const createApp = ({ queryClient, trpcClient, history }: AppDependencies) => {
  const router = createAppRouter({ queryClient, trpc: createTrpcOptions(trpcClient, queryClient) }, history)
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <RouterProvider router={router} />
      </TRPCProvider>
    </QueryClientProvider>
  )
}
