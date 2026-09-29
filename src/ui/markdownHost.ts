import type { RendererHost } from "./host"

/**
 * The renderer's host, from the four things only the embedding knows.
 *
 * Prose is not among them: the UI renders every Markdown field itself
 * (`./markdown`), the same in the webview and in a browser.
 */
export function createHost(
  notify: (message: string) => void,
  readFile: (path: string) => Promise<string>,
  openFile: (path: string, line: number) => void,
  openExternal: (url: string) => void,
): RendererHost {
  return { notify, readFile, openFile, openExternal }
}
