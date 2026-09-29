import * as fs from "node:fs/promises"
import { buildConfigGroups } from "../lib/schemas/configView"
import {
  descriptionRead,
  TOGGLEABLE_BODIES,
  type ToggleableBody,
} from "../lib/schemas/defaultProfile"
import * as vscode from "vscode"
import { DEFAULT_PROFILE, ProfileStore, profilesDir } from "../api/mcp/profiles"
import { tabIcon } from "./panel"
import {
  installPlugin,
  locations,
  machineName,
  pluginStatus,
} from "./setup"
import {
  RegistrationError,
  agentStates,
  registerWithCodex,
  type AgentId,
} from "../utils/setup/agents"
import {
  baseUrl,
  bitbucketUsername,
  clearCredential,
  credential,
  currentGitAdapterId,
  setBaseUrl,
  setBitbucketUsername,
  setGitAdapterId,
  storeCredential,
} from "./git-adapter/resolve"
import { GIT_ADAPTER_IDS, ghSignedIn } from "../utils/git-adapter/helpers/assemble"
import { CLOUD_HOSTS, GIT_ADAPTER_NAMES } from "../utils/git-adapter/helpers/select"
import type { GitAdapterId } from "../lib/git-adapter/types"
import {
  requestedPort,
  serverPort,
  serverUrl,
  startServer,
  startupError,
} from "./serverProcess"
import { ignoreAutoForward, isAutoForwardIgnored } from "./setup/ports"
import {
  assembleState,
  gitAdapterStep,
  serverStep,
  type Config,
  type Host,
  type State,
} from "../utils/setup/state"

/**
 * The guided setup view.
 *
 * A view rather than a command, and it opens itself the first time the
 * extension runs. Flight Plan does nothing useful until an agent can reach its
 * tools, and that registration happens in another application's configuration,
 * so an extension that waited to be asked would mostly sit there broken while
 * the user wondered what it was for.
 *
 * It is a **status list, not a wizard**. Every step reports what it found and
 * offers an action if there is one, and the steps can be done in any order or
 * not at all. A wizard would imply the steps are sequential and that finishing
 * is mandatory; neither is true, since registering with Codex is optional and a
 * user with `gh` already signed in has nothing to do for GitHub at all.
 */

const VIEW_TYPE = "flightPlan.setup"
/**
 * The extension version the setup view was last shown for.
 *
 * A version rather than the boolean this used to be. "Shown once, ever" was
 * wrong for the case that matters most: an extension upgrade leaves the copied
 * plugin and the MCP server at the old version, and an assistant then reports
 * the new tools as missing. That is the confusing failure the view exists to
 * explain, and it happens on exactly the occasions the old key suppressed it.
 */
const SHOWN_FOR_KEY = "flightPlan.setupShownForVersion"

/**
 * This extension's version.
 *
 * One reader, because two things compare against it: the install step, which
 * calls the copied plugin out of date, and the gate that opens this view after
 * an upgrade. They have to agree on what "current" is or the view opens saying
 * nothing is wrong.
 */
function extensionVersion(context: vscode.ExtensionContext): string {
  return (context.extension.packageJSON as { version?: string }).version ?? "0.0.0"
}

/** A store over this install's profiles directory, beside the server. */
function profileStore(context: vscode.ExtensionContext): ProfileStore {
  return new ProfileStore(profilesDir(locations(context).server))
}

/** The active profile's grouped configuration, for the settings screen. */
async function buildConfig(context: vscode.ExtensionContext): Promise<Config> {
  const store = profileStore(context)
  const active = await store.activeName()
  const read = await store.loadReader(active)
  const sections = await store.sections(active)
  return {
    profiles: await store.list(),
    active,
    editable: active !== DEFAULT_PROFILE,
    groups: buildConfigGroups(read, descriptionRead, sections),
  }
}

function nonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let value = ""
  for (let i = 0; i < 32; i += 1) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  }
  return value
}

/**
 * Gathers what only VS Code knows and builds the view's state from it.
 *
 * The building is `assembleState` in `src/api/setup/state.ts`; this reads the
 * settings, the keychain, the server process and the remote name for it.
 */
async function buildState(context: vscode.ExtensionContext): Promise<State> {
  const { plugin } = locations(context)
  const status = await pluginStatus(context)
  const url = serverUrl()
  const port = serverPort()
  const host: Host = { machine: machineName(), remote: vscode.env.remoteName !== undefined }

  const hasToken = new Set<GitAdapterId>()
  for (const id of GIT_ADAPTER_IDS) {
    if (id !== "git" && (await credential(context, id)) !== null) hasToken.add(id)
  }
  const gitAdapter = gitAdapterStep(
    {
      chosen: currentGitAdapterId(),
      baseUrl: baseUrl(),
      username: bitbucketUsername(),
      cliReady: await ghSignedIn(),
      hasToken,
      host,
    },
    await readGitAdapterGuides(context),
  )
  const server = serverStep(
    url,
    port,
    status.installed,
    requestedPort(context),
    startupError(),
    host,
    port !== null && isAutoForwardIgnored(port),
  )

  return assembleState({
    plugin,
    status,
    current: extensionVersion(context),
    agents: await agentStates(url, status.installed),
    url,
    gitAdapter,
    server,
    guide: await readGuide(context),
    config: await buildConfig(context),
    host,
  })
}

/** The per-host guides, read once per render. */
async function readGitAdapterGuides(
  context: vscode.ExtensionContext,
): Promise<Map<GitAdapterId, string>> {
  const guides = new Map<GitAdapterId, string>()
  await Promise.all(
    GIT_ADAPTER_IDS.map(async (id) => {
      const file = vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "forge",
        `${id}.md`,
      )
      try {
        guides.set(id, await fs.readFile(file.fsPath, "utf8"))
      } catch {
        // A missing guide costs that tab its prose and nothing else.
      }
    }),
  )
  return guides
}

/**
 * The How to use guide, from the extension's own resources.
 *
 * A Markdown file rather than strings in the view, so it can be written and
 * reviewed as prose. Failing to read it costs the guide tab and nothing else:
 * setup is the half somebody is blocked on.
 */
async function readGuide(context: vscode.ExtensionContext): Promise<string> {
  const file = vscode.Uri.joinPath(context.extensionUri, "resources", "how-to-use.md")
  try {
    return await fs.readFile(file.fsPath, "utf8")
  } catch {
    return "The guide could not be read. Reinstalling Flight Plan should restore it."
  }
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
 * The panel's shell.
 *
 * The page itself is a React bundle, the same as the walkthrough panel's, built
 * from `src/ui/setup`. No `'unsafe-eval'` and no remote sources:
 * setup has no highlighter to compile, so its policy is tighter than the
 * walkthrough's.
 */
function html(webview: vscode.Webview, root: vscode.Uri): string {
  const script = webview.asWebviewUri(vscode.Uri.joinPath(root, "setup.js"))
  const style = webview.asWebviewUri(vscode.Uri.joinPath(root, "setup.css"))
  const id = nonce()
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource}`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${id}'`,
  ].join("; ")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${style.toString()}" />
    ${codiconLink(webview, root, id)}
    <title>Flight Plan setup</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${id}" type="module" src="${script.toString()}"></script>
  </body>
</html>`
}

/**
 * Folder picker.
 *
 * In a remote window this browses the machine the extension runs on, which is
 * the machine these paths are on, so no translation is needed. That is only true
 * because Flight Plan is a workspace extension; as a UI extension it would
 * browse the laptop and hand back paths the server could never open.
 */
async function pickFolder(
  current: string,
  title: string,
): Promise<string | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    defaultUri: vscode.Uri.file(current),
    openLabel: "Use this folder",
    title,
  })
  return picked?.[0]?.fsPath
}

async function act(
  context: vscode.ExtensionContext,
  step: string,
  action: string,
): Promise<void> {
  const { plugin } = locations(context)

  if (step === "plugin" && action === "install") {
    // Two passes, and they cannot be collapsed: the server file has to exist
    // before it can be run, and its address is not known until it has bound a
    // port, so the plugin's declaration can only be written on the second.
    await installPlugin(context, null)
    const started = await startServer(context)
    await installPlugin(context, started)
    void vscode.window.showInformationMessage(
      "Flight Plan is installed and running. Restart Claude Code to load it.",
    )
    return
  }
  if (step === "server" && action === "ignorePort") {
    const port = serverPort()
    if (port === null) return
    await ignoreAutoForward(port)
    void vscode.window.showInformationMessage(
      `VS Code will stop offering to forward port ${port}.`,
    )
    return
  }

  if (step === "server" && action === "start") {
    await startServer(context)
    if ((await pluginStatus(context)).installed) {
      await installPlugin(context, serverUrl())
    }
    return
  }

  if (step === "server" && action === "changePort") {
    const wanted = requestedPort(context)
    const answer = await vscode.window.showInputBox({
      title: "Port for Flight Plan's server",
      value: wanted === 0 ? "" : String(wanted),
      prompt: "0 lets the system choose one and remember it.",
      validateInput: (value) => {
        const n = Number(value.trim())
        return Number.isInteger(n) && n >= 0 && n <= 65535
          ? null
          : "A port between 0 and 65535, or 0 to choose automatically."
      },
    })
    if (answer === undefined) return

    await vscode.workspace
      .getConfiguration("flightPlan")
      .update("serverPort", Number(answer.trim()), vscode.ConfigurationTarget.Global)

    // Nothing to restart before the server has ever run; the new port is simply
    // what it will ask for.
    if (!(await pluginStatus(context)).installed) return

    const wasRunning = serverUrl() !== null
    const restarted = await startServer(context)
    // Claude Code's declaration is ours to rewrite. Everyone else's is not.
    await installPlugin(context, restarted)
    if (wasRunning) {
      void vscode.window.showWarningMessage(
        "The address changed. Claude Code was updated for you; any other agent " +
          "you connected is still pointing at the old port and needs its " +
          "snippet again.",
      )
    }
    return
  }

  if (step === "connect" && action === "copyServer") {
    const address = serverUrl()
    if (address === null) {
      void vscode.window.showWarningMessage(
        "Flight Plan's server is not running. Install it first.",
      )
      return
    }
    await vscode.env.clipboard.writeText(address)
    void vscode.window.showInformationMessage(
      `Copied. This address answers on ${machineName()} only, while VS Code is open.`,
    )
    return
  }

  if (action === "reveal" || action === "copyPath") {
    const target = plugin
    if (action === "copyPath") {
      await vscode.env.clipboard.writeText(target)
      void vscode.window.showInformationMessage(
        `Copied. This path is on ${machineName()}.`,
      )
      return
    }
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(target))
    return
  }

  if (step === "plugin" && action === "choose") {
    const folder = await pickFolder(
      plugin,
      "Where should Flight Plan's skills and server be installed?",
    )
    if (folder === undefined) return
    // Moving the install means the old copy is stale and, worse, still
    // registered with any agent that points at it. Say so rather than leaving
    // two.
    const previous = (await pluginStatus(context)).installed ? plugin : null
    await vscode.workspace
      .getConfiguration("flightPlan")
      .update("pluginLocation", folder, vscode.ConfigurationTarget.Global)
    if (previous !== null && previous !== folder) {
      void vscode.window.showWarningMessage(
        `Flight Plan will install to the new folder. The old copy at ${previous} ` +
          `is still there, and any agent you connected still points at it. ` +
          `Reinstall, reconnect your agents, then delete the old folder.`,
      )
    }
    return
  }

  if (step.startsWith("connect:")) {
    const id = step.slice("connect:".length) as AgentId
    const installed = (await pluginStatus(context)).installed
    const agents = await agentStates(serverUrl(), installed)
    const agent = agents.find((candidate) => candidate.id === id)
    if (agent === undefined) return

    if (action === "copy") {
      await vscode.env.clipboard.writeText(agent.snippet)
      void vscode.window.showInformationMessage(`Snippet copied for ${agent.name}.`)
      return
    }
    if (action === "register" && id === "codex") {
      // The plugin must exist first: the snippet points at the copied server,
      // and registering a path to a file that is not there produces a failure
      // the user would have to debug inside Codex.
      if (!installed) {
        void vscode.window.showWarningMessage(
          "Install the plugin first. Codex needs a path to the server, and it does not exist yet.",
        )
        return
      }
      try {
        await registerWithCodex(serverUrl() ?? "")
        void vscode.window.showInformationMessage(
          "Added Flight Plan to Codex. Restart Codex to pick it up.",
        )
      } catch (cause) {
        void vscode.window.showWarningMessage(
          cause instanceof RegistrationError ? cause.message : String(cause),
        )
      }
    }
    return
  }

  /**
   * Switches how Flight Plan reaches the code host.
   *
   * One picker listing every option with what it costs and what it cannot do,
   * rather than making somebody open five tabs to compare them. Reachable from
   * the step itself and from the tab already in use, so there is never a state
   * with no way out of the current choice.
   */
  const changeGitAdapter = async (): Promise<void> => {
    const chosen = currentGitAdapterId()
    const picked = await vscode.window.showQuickPick(
      GIT_ADAPTER_IDS.map((id) => ({
        label: GIT_ADAPTER_NAMES[id],
        description: id === chosen ? "in use" : undefined,
        detail:
          id === "git"
            ? "Needs nothing. Reads the checkout. No pull requests, no links into a diff."
            : id === "gh"
              ? "The GitHub CLI, if it is installed and signed in. No token to store."
              : id === "github"
                ? "GitHub with a personal access token."
                : id === "gitlab"
                  ? "GitLab with a personal access token."
                  : "Bitbucket Cloud with an API token. Read-only.",
        id,
      })),
      {
        title: "How should Flight Plan reach your code host?",
        placeHolder: `Currently ${GIT_ADAPTER_NAMES[chosen]}`,
        ignoreFocusOut: true,
      },
    )
    if (picked === undefined || picked.id === chosen) return

    await setGitAdapterId(picked.id)
    // Said rather than assumed. Choosing a host that has no credential yet is a
    // legitimate first step, and the tab it lands on is where the token goes.
    const needsToken =
      picked.id !== "git" &&
      picked.id !== "gh" &&
      (await credential(context, picked.id)) === null
    void vscode.window.showInformationMessage(
      needsToken
        ? `Flight Plan will use ${GIT_ADAPTER_NAMES[picked.id]}. Add a token on its tab to finish.`
        : `Flight Plan will use ${GIT_ADAPTER_NAMES[picked.id]}.`,
    )
    await vscode.commands.executeCommand("flightPlan.refreshPullRequests")
  }

  if (step === "forge" && action === "change") {
    await changeGitAdapter()
    return
  }

  if (step.startsWith("forge:")) {
    const id = step.slice("forge:".length) as GitAdapterId
    if (!GIT_ADAPTER_IDS.includes(id)) return

    if (action === "change") {
      await changeGitAdapter()
      return
    }

    if (action === "use") {
      await setGitAdapterId(id)
      void vscode.window.showInformationMessage(
        `Flight Plan will use ${GIT_ADAPTER_NAMES[id]}. Refresh the review list to see it.`,
      )
      await vscode.commands.executeCommand("flightPlan.refreshPullRequests")
      return
    }

    if (action === "token") {
      const isBitbucket = id === "bitbucket"
      const value = await vscode.window.showInputBox({
        title: isBitbucket
          ? "Bitbucket API token"
          : `${GIT_ADAPTER_NAMES[id]} personal access token`,
        prompt: isBitbucket
          ? "An Atlassian API token for the Bitbucket app, with the read:repository:bitbucket and read:pullrequest:bitbucket scopes."
          : id === "gitlab"
            ? "A token with the read_api scope."
            : "A fine-grained token with read access to the repositories you review.",
        password: true,
        ignoreFocusOut: true,
        validateInput: (typed) =>
          typed.trim() === "" ? "Paste it, or cancel." : null,
      })
      if (value === undefined) return
      await storeCredential(context, id, value.trim())
      // Stored is not the same as chosen, and choosing for somebody is how a
      // window quietly starts reading a different host than it did a moment
      // ago. Offered instead.
      if (currentGitAdapterId() !== id) {
        const choice = await vscode.window.showInformationMessage(
          `Saved. Flight Plan is still using ${GIT_ADAPTER_NAMES[currentGitAdapterId()]}.`,
          `Use ${GIT_ADAPTER_NAMES[id]}`,
        )
        if (choice !== undefined) {
          await setGitAdapterId(id)
          await vscode.commands.executeCommand("flightPlan.refreshPullRequests")
        }
      }
      return
    }

    if (action === "clearToken") {
      await clearCredential(context, id)
      void vscode.window.showInformationMessage(
        `Removed the ${GIT_ADAPTER_NAMES[id]} credential from your keychain.`,
      )
      return
    }

    if (action === "username") {
      const typed = await vscode.window.showInputBox({
        title: "Atlassian account email",
        value: bitbucketUsername(),
        prompt: "The email of your Atlassian account, not your Bitbucket username.",
        ignoreFocusOut: true,
        validateInput: (value) =>
          value.trim() === "" || value.includes("@") ? null : "That is not an email address.",
      })
      if (typed === undefined) return
      await setBitbucketUsername(typed.trim())
      return
    }

    if (action === "baseUrl") {
      const typed = await vscode.window.showInputBox({
        title: `Base URL for ${GIT_ADAPTER_NAMES[id]}`,
        value: baseUrl(),
        prompt:
          `Leave empty for ${CLOUD_HOSTS[id] ?? "the cloud host"}. For a ` +
          `self-hosted instance, give its address, for example ` +
          `https://gitlab.example.com.`,
        ignoreFocusOut: true,
        validateInput: (value) => {
          const trimmed = value.trim()
          if (trimmed === "") return null
          try {
            new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
            return null
          } catch {
            return "That is not an address Flight Plan can read."
          }
        },
      })
      if (typed === undefined) return
      await setBaseUrl(typed.trim())
      // The remote has to be on this host, and the list is where that is
      // discovered, so refresh rather than leave it stale.
      await vscode.commands.executeCommand("flightPlan.refreshPullRequests")
      return
    }
  }
}

function isToggleableBody(value: unknown): value is ToggleableBody {
  return typeof value === "string" && (TOGGLEABLE_BODIES as readonly string[]).includes(value)
}

/**
 * Apply one configuration change from the settings screen.
 *
 * Every case ends by the caller re-sending state, so the screen reflects what
 * landed. Creating a profile switches to it: the point of creating one is to
 * edit it, and the default is read-only.
 */
async function actConfig(
  context: vscode.ExtensionContext,
  message: {
    op?: string
    profile?: string
    name?: string
    path?: string
    content?: string
    body?: string
    on?: boolean
  },
): Promise<void> {
  const store = profileStore(context)
  switch (message.op) {
    case "switch":
      if (typeof message.profile === "string") await store.setActive(message.profile)
      return
    case "create":
      if (typeof message.name === "string") {
        await store.create(message.name)
        await store.setActive(message.name)
      }
      return
    case "save":
      if (typeof message.path === "string" && typeof message.content === "string") {
        await store.write(await store.activeName(), message.path, message.content)
      }
      return
    case "toggle":
      if (isToggleableBody(message.body) && typeof message.on === "boolean") {
        await store.setSection(await store.activeName(), message.body, message.on)
      }
      return
  }
}

export async function openSetupView(
  context: vscode.ExtensionContext,
): Promise<void> {
  const root = vscode.Uri.joinPath(context.extensionUri, "dist", "webview")

  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    "Flight Plan setup",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [root],
    },
  )
  panel.iconPath = tabIcon(context)

  const send = async () => {
    await panel.webview.postMessage({
      type: "state",
      state: await buildState(context),
    })
  }

  panel.webview.onDidReceiveMessage(
    (message: {
      type?: string
      step?: string
      action?: string
      op?: string
      profile?: string
      name?: string
      path?: string
      content?: string
      body?: string
      on?: boolean
    }) => {
      if (message.type === "ready") {
        void send()
        return
      }
      if (message.type === "config") {
        void actConfig(context, message)
          .catch((cause: unknown) => {
            void vscode.window.showErrorMessage(`Flight Plan: ${String(cause)}`)
          })
          .then(send)
        return
      }
      if (
        message.type !== "action" ||
        typeof message.step !== "string" ||
        typeof message.action !== "string"
      ) {
        return
      }
      // Always re-send, including after a failure: the buttons disable
      // themselves on click, so a step that did nothing would otherwise be
      // stuck looking busy.
      void act(context, message.step, message.action)
        .catch((cause: unknown) => {
          // The server steps report their own failures in the list, so a
          // notification would say the same thing twice.
          if (message.step === "server") return
          void vscode.window.showErrorMessage(`Flight Plan: ${String(cause)}`)
        })
        .then(send)
    },
  )

  panel.webview.html = html(panel.webview, root)
}

/**
 * Opens the view once per installed version: on a first install, and on every
 * reinstall or upgrade.
 *
 * Reinstalling is the occasion the view is most useful, because it is when
 * something is most likely to be half-updated. The extension carries a new
 * bundled server and new skills; the copies on disk are still the old ones
 * until somebody presses Reinstall, and until then an agent is talking to the
 * previous server and will report the current tools as missing. The view
 * already says exactly that, with the button to fix it.
 *
 * Still keyed on `globalState` and not on whether the plugin directory exists,
 * so somebody who deliberately removed the tooling is not asked again on every
 * window — only when the version changes under them.
 */
export async function openSetupViewOnInstall(
  context: vscode.ExtensionContext,
): Promise<void> {
  const current = extensionVersion(context)
  if (context.globalState.get<string>(SHOWN_FOR_KEY) === current) return
  // Recorded before opening, so a failure to open does not queue the view up
  // again on every window of the session.
  await context.globalState.update(SHOWN_FOR_KEY, current)
  await openSetupView(context)
}
