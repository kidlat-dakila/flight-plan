import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import LabRoutes from "./app/lab-routes"
import "./styles.css"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Missing #root element in index.html")

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LabRoutes />
    </QueryClientProvider>
  </StrictMode>,
)
