import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useState } from "react"
import { api } from "~/client/api"
import { PartyList } from "~/client/PartyList"

export function App() {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => api.createClient({ links: [httpBatchLink({ url: "/trpc" })] }))
  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <PartyList />
      </api.Provider>
    </QueryClientProvider>
  )
}
