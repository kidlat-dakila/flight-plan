import { createContext, useContext } from "react"
import { openLinksOutside, openOutside } from "./browserHost"

/**
 * What the page asks of whatever it runs in.
 *
 * The same routes run in a browser tab and in the VS Code webview. The data
 * comes from the API in both; only these actions differ. A `null` action is
 * one the page does itself: a toast for `notify`, the file on the adapter for
 * `openFile`, the `/setup` route for `openSetup`.
 */
export type Shell = {
  /** VS Code sets the `--vscode-*` variables itself; a browser takes them from the theme. */
  appliesTheme: boolean
  notify: ((message: string) => void) | null
  openExternal: (url: string) => void
  openFile: ((path: string, line: number) => void) | null
  openSetup: (() => void) | null
  /** Fetching the branch of a stale walkthrough; only VS Code can. */
  fetchBranch: (() => void) | null
  /** What a click on a rendered link does. Returns its own removal. */
  guardLinks: (doc: Document) => () => void
}

export const browserShell: Shell = {
  appliesTheme: true,
  notify: null,
  openExternal: openOutside,
  openFile: null,
  openSetup: null,
  fetchBranch: null,
  guardLinks: openLinksOutside,
}

const ShellContext = createContext<Shell>(browserShell)

export const ShellProvider = ShellContext.Provider

export function useShell(): Shell {
  return useContext(ShellContext)
}
