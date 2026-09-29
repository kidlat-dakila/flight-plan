import { createContext, useContext } from "react"

/**
 * What the renderer needs from whatever is embedding it.
 *
 * Everything that needs the extension host is behind this one interface. There
 * are two implementations: the VS Code panel, which forwards to the extension
 * over `postMessage`, and the browser routes (`app/ReviewPage.tsx`), which read
 * files from the HTTP API.
 */
export type RendererHost = {
  /** Brief message to the user, for example after a copy. */
  notify: (message: string) => void

  /**
   * Reads a repository file by its repository-relative path.
   *
   * A walkthrough references code rather than pasting it, so the renderer needs
   * a way to fetch the file it names. Only the host knows where the repository
   * is, and in the eventual product it may not be on disk at all: the same call
   * serves a checkout, a GitHub tree at a commit, or a cache. Rejecting is the
   * normal way to report a missing file; the reader is told which reference
   * failed rather than being shown a gap.
   */
  readFile: (path: string) => Promise<string>

  /**
   * Opens a repository file in the host's editor, at a line.
   *
   * Only offered for files the host has decided are safe to open: the same
   * path, at the same commit, unmodified. The renderer does not make that
   * judgement, because it cannot — it does not know what the code on disk is.
   */
  openFile: (path: string, line: number) => void

  /**
   * Opens a URL outside the host: a pull request page, a permalink, a diff.
   *
   * It exists because an anchor is not reliable in a webview. A webview must
   * not navigate itself, so VS Code intercepts a link click and decides what to
   * do with it, and a link that quietly does nothing is the result when it
   * decides not to. Going through the host makes the intent explicit: the
   * renderer says which URL, and the host opens it.
   */
  openExternal: (url: string) => void
}

const Context = createContext<RendererHost | null>(null)

export const RendererHostProvider = Context.Provider

export function useHost(): RendererHost {
  const host = useContext(Context)
  if (host === null) {
    throw new Error("useHost was called outside RendererHostProvider")
  }
  return host
}
