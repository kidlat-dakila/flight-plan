import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import type { ReactNode } from "react"
import type { ThemeInput } from "../highlight"
import { configureApi, shouldRetry, themeQuery } from "./api"
import { memoryRouter } from "./router"
import { ShellProvider, type Shell } from "./shell"
import { webviewConfig } from "./webviewConfig"
import { bridgeTransport, isBridgeReply } from "./bridge"

/**
 * The VS Code panel: the same routes as the browser, in a memory history
 *.
 *
 * The data comes from the API, as in a browser, but through the extension:
 * the page runs where the window is, the server where the extension host is,
 * and in a remote window those are two machines (`BridgeRequest`). The rest
 * of `postMessage` is what needs the editor: the theme for the highlighter,
 * the status bar, the editor, the checked `openExternal`, the setup view and
 * `git fetch`.
 */

export type VsCodeApi = { postMessage: (message: unknown) => void }

/** What the extension sends the webview. */
type ExtensionMessage = { type: "theme"; theme: ThemeInput }

/**
 * Stops any link from navigating the panel, whatever else happens.
 *
 * A webview that follows a link stops being the app: the walkthrough is
 * replaced by whatever the href pointed at, and the panel is dead until it is
 * reopened. Every outward link is meant to go through `openExternal` instead,
 * and one did not — a click intercepted higher up never reached the handler
 * that calls `preventDefault`, and the panel navigated to GitHub.
 *
 * So this cancels the navigation and nothing else. It deliberately does not
 * open anything: deciding *what* a click means belongs to the component that
 * was clicked, and a guard that also opened the link would turn the click that
 * merely ends a text selection into an unasked-for trip to the browser. The
 * capture phase on the document, so it runs before any handler that might stop
 * the event reaching the rest.
 */
function cancelNavigation(doc: Document): () => void {
  const cancel = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest("a[href]")
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (!/^https?:$/i.test(anchor.protocol)) return
    event.preventDefault()
  }
  doc.addEventListener("click", cancel, true)
  return () => {
    doc.removeEventListener("click", cancel, true)
  }
}

export function webviewApp(api: VsCodeApi, dataset: Record<string, string | undefined>): ReactNode {
  const config = webviewConfig(dataset)
  const client = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })

  /*
   * The theme VS Code is showing, from the extension: the first one
   * answers the theme query, and every later one replaces its data, so a
   * theme change recolours the code without a reload.
   */
  let firstTheme: (theme: ThemeInput) => void = () => undefined
  const theme = new Promise<ThemeInput>((resolve) => {
    firstTheme = resolve
  })
  const transport = bridgeTransport(
    (request) => {
      api.postMessage(request)
    },
    (onReply) => {
      window.addEventListener("message", (event: MessageEvent<unknown>) => {
        if (isBridgeReply(event.data)) onReply(event.data)
      })
    },
  )
  configureApi({ transport, theme: () => theme })
  window.addEventListener("message", (event: MessageEvent<ExtensionMessage>) => {
    const data = event.data
    if (data?.type !== "theme") return
    firstTheme(data.theme)
    client.setQueryData(themeQuery().queryKey, data.theme)
  })

  const shell: Shell = {
    appliesTheme: false,
    notify: (message) => {
      api.postMessage({ type: "notify", message })
    },
    openExternal: (url) => {
      api.postMessage({ type: "openExternal", url })
    },
    openFile: (path, line) => {
      api.postMessage({ type: "openFile", path, line })
    },
    openSetup: () => {
      api.postMessage({ type: "openSetup" })
    },
    fetchBranch: () => {
      api.postMessage({ type: "fetchBranch" })
    },
    guardLinks: cancelNavigation,
  }

  // After the listener, so the theme the extension sends in reply is heard.
  api.postMessage({ type: "ready" })

  return (
    <ShellProvider value={shell}>
      <QueryClientProvider client={client}>
        <RouterProvider router={memoryRouter(config.route)} />
      </QueryClientProvider>
    </ShellProvider>
  )
}
