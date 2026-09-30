import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createAppRouter } from "./router"
import { createTrpcClient, TRPCProvider } from "./trpc"
import "./styles.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Missing #root element in index.html")

const queryClient = new QueryClient()
const trpcClient = createTrpcClient()
const router = createAppRouter()

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <RouterProvider router={router} />
      </TRPCProvider>
    </QueryClientProvider>
  </StrictMode>,
)
