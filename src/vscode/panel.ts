import * as fsSync from "node:fs"
import * as vscode from "vscode"
import { activeTheme } from "./theme"
import { locations } from "./setup"
import { serverPort } from "./serverProcess"
import type { Prompts } from "../utils/clipboard"
import { readCheckouts } from "../api/mcp/checkouts"
import { resolveInRoot } from "../utils/repo"
import { bridgeUrl, routes, type BridgeReply, type BridgeRequest, type PanelContext } from "../api/api/protocol"
import { allowedExternal, apiOrigin, panelCsp, panelTarget, type PanelTarget } from "./utils/panel"

const VIEW_TYPE = "flightPlan.walkthrough"

function nonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let value = ""
  for (let i = 0; i < 32; i += 1) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return value
}

/**
 * The codicon stylesheet link `vscode-icon` requires.
 *
 * The id is not decoration: the component looks up `vscode-codicon-stylesheet`
 * by id, reads this href and this nonce, and re-injects the same link inside
 * its own shadow root, because document CSS does not cross a shadow boundary.
 * Without it every icon renders as an empty box and says so only in the
 * console.
 */
function codiconLink(webview: vscode.Webview, root: vscode.Uri, id: string): string {
  const href = webview.asWebviewUri(vscode.Uri.joinPath(root, "codicon.css"))
  return `<link
      rel="stylesheet"
      id="vscode-codicon-stylesheet"
      nonce="${id}"
      href="${href.toString()}"
    />`
}

/**
 * The mark on a walkthrough's editor tab.
 *
 * One file for both themes. A tab icon is an image and the theme does not
 * recolour it, so this was briefly a light and a dark pair; the mark is the
 * accent in either theme now, and two identical files are two things to keep
 * in step. Built by `tools/icon.py` from the same artwork as the marketplace
 * icon, with the strokes thickened, because at 16 logical pixels the source's
 * own strokes are two thirds of one.
 */
export function tabIcon(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.extensionUri, "resources", "panel-icon.png")
}

type Boot = { route: string }

function attribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/**
 * The panel's page: the UI bundle, told which route to open. An attribute on
 * `#root`, because the page needs it
 * before its first request.
 */
function html(webview: vscode.Webview, root: vscode.Uri, boot: Boot): string {
  const script = webview.asWebviewUri(vscode.Uri.joinPath(root, "main.js"))
  const style = webview.asWebviewUri(vscode.Uri.joinPath(root, "main.css"))
  const id = nonce()
  const csp = panelCsp({ cspSource: webview.cspSource, nonce: id })

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${style.toString()}" />
    ${codiconLink(webview, root, id)}
    <title>Flight Plan</title>
  </head>
  <body>
    <div
      id="root"
      data-route="${attribute(boot.route)}"
    ></div>
    <script nonce="${id}" type="module" src="${script.toString()}"></script>
  </body>
</html>`
}

/**
 * Whichever walkthrough panel is in front, and what its title bar can copy.
 *
 * Held here rather than passed to a command, because a title-bar command is
 * invoked by VS Code with no arguments: it has to be able to ask what the user
 * is currently looking at. Cleared when the panel loses focus, so a command can
 * never act on a walkthrough that is no longer on screen.
 */
export type ActiveDocument = {
  /** The document's Flight Plan path, for example `owner/repo:plan/name`. */
  planRef: string
  toolHint: string
  prompts: Prompts | null
}

let active: ActiveDocument | null = null

export function currentDocument(): ActiveDocument | null {
  return active
}

/**
 * Publishes whether the prompt buttons have anything to copy.
 *
 * A `when` clause rather than a check inside the command, because the two
 * buttons are drawn for every walkthrough panel, and a plan is a walkthrough
 * panel too. Checking inside the command
 * left the buttons visible and made them warn when pressed, which is how this
 * was found.
 */
function setActive(next: ActiveDocument | null): void {
  active = next
  void vscode.commands.executeCommand(
    "setContext",
    "flightPlan.canCopyPrompt",
    next?.prompts != null,
  )
}

/** One panel per document: opening it again brings the open one forward. */
const open = new Map<string, vscode.WebviewPanel>()

/**
 * Opens `/review-flight-plan/{id}` in the "Review Flight Plan" panel.
 *
 * The webview reads everything from the API; the extension answers only what
 * needs the editor. `preserveFocus` reveals an open panel without taking the
 * reader's focus, for a panel the server raised rather than the reader.
 */
export function openReview(
  context: vscode.ExtensionContext,
  id: string,
  options: { title?: string; preserveFocus?: boolean } = {},
): void {
  const target = panelTarget(id, options.title)
  if (target === null) {
    void vscode.window.showWarningMessage(`Flight Plan: ${id} does not name a document.`)
    return
  }
  const existing = open.get(id)
  if (existing !== undefined) {
    existing.reveal(undefined, options.preserveFocus === true)
    return
  }

  const root = vscode.Uri.joinPath(context.extensionUri, "dist", "webview")
  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    target.title,
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: options.preserveFocus === true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [root],
    },
  )
  panel.iconPath = tabIcon(context)
  open.set(id, panel)

  const boot: Boot = { route: target.route }
  const mine: ActiveDocument = { planRef: target.planRef, toolHint: "read", prompts: target.prompts }
  if (panel.active) setActive(mine)
  panel.onDidChangeViewState(() => {
    if (panel.active) setActive(mine)
    else if (active === mine) setActive(null)
  })

  const postTheme = async () => {
    await panel.webview.postMessage({ type: "theme", theme: await activeTheme() })
  }
  const themeListener = vscode.window.onDidChangeActiveColorTheme(() => {
    void postTheme()
  })

  const guard = contextGuard(target)

  panel.webview.onDidReceiveMessage(
    (message: { type?: string; path?: string; line?: number; message?: string; url?: string }) => {
      if (message.type === "api") {
        void carry(message as BridgeRequest).then((reply) => panel.webview.postMessage(reply))
        return
      }
      if (message.type === "ready") {
        void postTheme()
        return
      }
      if (message.type === "notify" && typeof message.message === "string") {
        void vscode.window.setStatusBarMessage(message.message, 2000)
        return
      }
      if (message.type === "openSetup") {
        void vscode.commands.executeCommand("flightPlan.openSetup")
        return
      }
      if (message.type === "fetchBranch") {
        // The name comes from the panel's own id, never from the message. A
        // webview is not a trusted source of an argument that reaches a
        // subprocess, and this one reaches `git fetch`.
        if (target.branch === null) {
          void vscode.window.showWarningMessage(
            "Flight Plan: there is no branch to fetch for this walkthrough.",
          )
          return
        }
        void vscode.commands.executeCommand("flightPlan.fetchBranch", target.branch)
        return
      }
      if (message.type === "openExternal") {
        const url = message.url
        if (typeof url !== "string") return
        void guard.prUrl().then((prUrl) => {
          if (allowedExternal(url, prUrl)) void vscode.env.openExternal(vscode.Uri.parse(url, true))
        })
        return
      }
      if (message.type === "openFile") {
        const { path: requested, line } = message
        if (typeof requested !== "string") return
        void guard.openable(requested).then(async (allowed) => {
          if (!allowed) return
          await openInEditor(context, target.repo, requested, typeof line === "number" ? line : 1)
        })
      }
    },
  )

  panel.onDidDispose(() => {
    themeListener.dispose()
    if (open.get(id) === panel) open.delete(id)
    if (active === mine) setActive(null)
  })

  panel.webview.html = html(panel.webview, root, boot)
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    watchBundle(context, panel, root, boot)
  }
}

/**
 * What the panel offered, read back from the API to check a message against.
 *
 * The webview only offers to open the files the context lists and only builds
 * links on the change's own host, but a message naming anything else is not
 * something to act on, whatever sent it. So the extension asks the API for the
 * same context the page shows. Read once and kept; read again when a path is
 * not in it, because a document still being written gains files.
 */
function contextGuard(target: PanelTarget) {
  let cached: Promise<PanelContext | null> | null = null
  const read = (fresh: boolean): Promise<PanelContext | null> => {
    if (cached === null || fresh) {
      const port = serverPort()
      cached =
        port === null
          ? Promise.resolve(null)
          : fetch(`${apiOrigin(port)}${routes.context(target.id)}`)
              .then(async (response) => (response.ok ? ((await response.json()) as PanelContext) : null))
              .catch(() => null)
    }
    return cached
  }
  return {
    prUrl: async (): Promise<string | null> => (await read(false))?.links?.prUrl ?? null,
    openable: async (path: string): Promise<boolean> => {
      if ((await read(false))?.openable?.includes(path) === true) return true
      return (await read(true))?.openable?.includes(path) === true
    },
  }
}

/**
 * One API request from the webview, sent to the server from here (see
 * `BridgeRequest`).
 *
 * The extension host runs on the same machine as the server, so this reaches
 * it in every kind of window: local, SSH, a dev container, a cloud workspace.
 * The port is read on every request, so a panel follows a server that
 * restarted on another port. Only `/api/` routes on the server's own origin
 * are sent (`bridgeUrl`), and only GET and POST.
 */
async function carry(request: BridgeRequest): Promise<BridgeReply> {
  const { id } = request
  if (typeof id !== "number") return { type: "apiReply", id: -1, error: "The request had no id.", final: true }
  const port = serverPort()
  if (port === null) {
    return {
      type: "apiReply",
      id,
      error: "The Flight Plan server is not running. Start it from the Flight Plan setup view (Flight Plan: Open Setup).",
      final: true,
    }
  }
  const origin = apiOrigin(port)
  const url = typeof request.route === "string" ? bridgeUrl(origin, request.route) : null
  const method = request.method === "POST" ? "POST" : request.method === "GET" ? "GET" : null
  if (url === null || method === null) return { type: "apiReply", id, error: "The panel asked for something that is not an API route.", final: true }
  try {
    const response = await fetch(url, {
      method,
      ...(method === "POST" && typeof request.body === "string"
        ? { body: request.body, headers: { "content-type": "application/json" } }
        : {}),
    })
    return {
      type: "apiReply",
      id,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "text/plain",
      body: await response.text(),
    }
  } catch {
    return {
      type: "apiReply",
      id,
      error: `The Flight Plan server did not answer at ${origin}. Restart it from the Flight Plan setup view (Flight Plan: Open Setup).`,
      final: false,
    }
  }
}

/**
 * Opens a cited file in the editor, at the line the waypoint is about.
 *
 * Only reached for paths the panel decided were safe: same commit, unmodified.
 * The file is the one in the checkout the server reads the repository from,
 * confined to it. The line is revealed near the top rather than centred,
 * because a waypoint's first line is the start of something and the reader
 * wants what follows it.
 */
async function openInEditor(
  context: vscode.ExtensionContext,
  repo: string,
  relative: string,
  line: number,
): Promise<void> {
  const root = (await readCheckouts(locations(context).server))[repo]
  if (root === undefined) return
  const file = resolveInRoot(root, relative)
  if (file === null) return
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file))
  const at = new vscode.Position(Math.max(0, line - 1), 0)
  await vscode.window.showTextDocument(document, {
    selection: new vscode.Range(at, at),
    viewColumn: vscode.ViewColumn.Beside,
    preserveFocus: false,
  })
}

/**
 * Reloads the panel when the webview bundle is rebuilt.
 *
 * `vite build --watch` keeps `dist/webview` current, but a webview already
 * showing a page will not notice. Re-assigning `html` reloads it, which is the
 * closest thing to hot reload without wiring a dev server into the panel.
 *
 * Development mode only, and `fs.watch` rather than a workspace watcher because
 * the extension's own folder is not necessarily part of the workspace when it
 * is run from `--extensionDevelopmentPath`.
 */
function watchBundle(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  root: vscode.Uri,
  boot: Boot,
): void {
  let pending: NodeJS.Timeout | undefined

  let watcher: fsSync.FSWatcher
  try {
    watcher = fsSync.watch(root.fsPath, { recursive: false }, () => {
      // A rebuild writes several files, so wait for it to settle rather than
      // reloading once per file.
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        panel.webview.html = html(panel.webview, root, boot)
      }, 250)
    })
  } catch {
    // The bundle has never been built. Nothing to watch, and the panel will
    // show the usual empty webview until it is.
    return
  }

  const disposable = new vscode.Disposable(() => {
    if (pending) clearTimeout(pending)
    watcher.close()
  })
  panel.onDidDispose(() => {
    disposable.dispose()
  })
  context.subscriptions.push(disposable)
}
