import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { createAppRouter } from "./app/router"
import { shouldRetry } from "./app/api"
import { legacySampleUrl } from "./app/ids"
import { webviewApp, type VsCodeApi } from "./app/webview"
import "./styles/renderer.css"
import "./prose.css"
import "./harness.css"

declare function acquireVsCodeApi(): VsCodeApi

/**
 * One bundle for the browser and the VS Code panel: the same routes in both,
 * with browser history in a tab and a
 * memory history in the webview, which the extension points at a route.
 */
const container = document.getElementById("root")
if (container) {
  const inVsCode = typeof acquireVsCodeApi === "function"
  if (!inVsCode) {
    document.documentElement.classList.add("fp-harness")
    const legacy = legacySampleUrl(window.location.search)
    if (legacy !== null) window.history.replaceState(null, "", legacy)
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })

  createRoot(container).render(
    <div className="fp-host">
      {inVsCode ? (
        webviewApp(acquireVsCodeApi(), container.dataset)
      ) : (
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={createAppRouter()} />
        </QueryClientProvider>
      )}
    </div>,
  )
}
