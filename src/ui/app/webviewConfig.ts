/**
 * What the extension tells the webview in the panel's HTML: which route to open.
 *
 * An attribute on `#root` rather than a message, because the page needs it
 * before its first request, and a message could only arrive after it.
 * Kept apart from the entry so a test needs no DOM.
 */

export type WebviewConfig = {
  route: string
}

/** Reads `data-route`; a bad value falls back. */
export function webviewConfig(dataset: Record<string, string | undefined>): WebviewConfig {
  const route = dataset["route"] ?? ""
  return {
    // Only a path: the memory history must not be pointed at another origin.
    route: route.startsWith("/") && !route.startsWith("//") ? route : "/review-flight-plan/sample",
  }
}
