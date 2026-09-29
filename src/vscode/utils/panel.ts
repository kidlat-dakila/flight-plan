import { planPrompts, walkthroughPrompts, type Prompts } from "../../utils/clipboard"
import { formatId, parseId, walkthroughKeyOf, walkthroughName, type WalkthroughKey } from "../../api/mcp/documentId"
import { planIdOf } from "../../api/mcp/identity"
import { reviewRoute } from "../../api/api/protocol"
import { label } from "../../utils/pr/review"

/**
 * The pure half of the "Review Flight Plan" panel; `src/vscode/panel.ts` owns
 * the webview. The panel is a route: the webview reads the document, its
 * context and its files from the API, and the extension knows only which `{id}` it shows.
 */

/** Everything the extension derives from the `{id}` a panel shows. */
export type PanelTarget = {
  id: string
  /** The UI route the webview opens. */
  route: string
  title: string
  /** The plan ref the title-bar copy buttons name the document by. */
  planRef: string
  prompts: Prompts | null
  repo: string
  /** The branch `fetchBranch` fetches: a branch walkthrough's own. */
  branch: string | null
}

export function walkthroughId(repo: string, key: WalkthroughKey): string {
  return formatId({ kind: "walkthrough", repo, name: walkthroughName(key) })
}

export function planId(repo: string, name: string): string {
  return formatId({ kind: "plan", repo, name })
}

/** Null for an id that names no document. */
export function panelTarget(id: string, title?: string): PanelTarget | null {
  const parsed = parseId(id)
  if (parsed === null) return null
  const route = reviewRoute(id)
  if (parsed.kind === "plan") {
    return {
      id,
      route,
      title: title ?? parsed.name,
      planRef: planIdOf({ kind: "create", repo: parsed.repo, name: parsed.name }),
      prompts: planPrompts(parsed.repo, parsed.name),
      repo: parsed.repo,
      branch: null,
    }
  }
  const key = walkthroughKeyOf(parsed.name)
  if (key === null) return null
  return {
    id,
    route,
    title: title ?? label(parsed.repo, key),
    planRef: planIdOf({ kind: "review", repo: parsed.repo, key }),
    prompts: walkthroughPrompts(parsed.repo, key),
    repo: parsed.repo,
    branch: key.kind === "branch" ? key.name : null,
  }
}

/** `http://127.0.0.1:<port>`, where the extension reaches the server. */
export function apiOrigin(port: number): string {
  return `http://127.0.0.1:${String(port)}`
}

/**
 * The webview's Content-Security-Policy.
 *
 * `wasm-unsafe-eval` is required: the highlighter compiles an inlined
 * oniguruma WebAssembly binary, and without it the webview refuses and every
 * code block renders uncoloured. There is no `connect-src`: the page reaches
 * the API through the extension, never over the network (`BridgeRequest`).
 * Everything else is deliberately closed: `default-src 'none'` means an
 * accidental network reference fails loudly rather than silently phoning out.
 */
export function panelCsp(input: { cspSource: string; nonce: string }): string {
  return [
    "default-src 'none'",
    `img-src ${input.cspSource} data:`,
    `font-src ${input.cspSource}`,
    `style-src ${input.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${input.nonce}' 'wasm-unsafe-eval'`,
  ].join("; ")
}

/**
 * Whether a link the panel offered may go to the reader's browser.
 *
 * A walkthrough is a document written by whoever opened the pull request, so
 * a URL arriving over the webview channel is not automatically one to hand to
 * a browser. The rule is the tightest one that still admits every link the
 * panel builds: `https`, no credentials, on the pull request's own host (so
 * GitHub Enterprise works), else github.com, where a blob permalink points.
 */
export function allowedExternal(raw: string, prUrl: string | null): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return false
  let expected = "github.com"
  if (prUrl !== null && prUrl !== "") {
    try {
      expected = new URL(prUrl).host
    } catch {
      // Keep the default rather than allow something unchecked.
    }
  }
  return url.host === expected
}

/** The notification when `complete` succeeds, or null for an id that names nothing. */
export function completedMessage(id: string): string | null {
  const target = panelTarget(id)
  if (target === null) return null
  return id.startsWith("plan/")
    ? `Flight Plan: the plan ${target.title} is complete.`
    : `Flight Plan: the walkthrough for ${target.title} is complete.`
}
