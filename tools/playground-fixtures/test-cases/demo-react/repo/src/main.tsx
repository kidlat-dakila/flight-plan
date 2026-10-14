import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import { SessionProvider } from "@/components/SessionProvider"
import { queryClient } from "@/lib/query-client"
import { router } from "@/router"

const rootElement = document.getElementById("root")
if (rootElement === null) throw new Error("The page has no #root element.")

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
