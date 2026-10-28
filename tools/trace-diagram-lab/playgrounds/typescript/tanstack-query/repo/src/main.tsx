import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/App"
import { queryClient } from "@/lib/query-client"

const rootElement = document.getElementById("root")
if (rootElement === null) throw new Error("The page has no #root element.")

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
