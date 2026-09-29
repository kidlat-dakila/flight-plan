import * as path from "node:path"
import { GIT_ADAPTER_IDS } from "../git-adapter/helpers/assemble"
import { CLOUD_HOSTS, GIT_ADAPTER_NAMES } from "../git-adapter/helpers/select"
import type { GitAdapterId } from "../../lib/git-adapter/types"
import type { ConfigGroup } from "../../lib/schemas/configView"
import type { AgentState } from "./agents"
import type { PluginStatus } from "../../vscode/utils/setupInstall"

/**
 * What the setup view shows, built from facts gathered elsewhere.
 *
 * Every builder here is pure. `src/vscode/setupView.ts` reads the facts that
 * only VS Code has (settings, the keychain, the remote name, the server
 * process) and passes them in.
 */

/** Where the extension host runs, for wording that names the machine. */
export type Host = {
  /** "this machine", "the SSH workspace", …; see `machineOf`. */
  machine: string
  /** True in a remote window: paths are on another computer than the window. */
  remote: boolean
}

/** What the adapter step is built from. */
export type GitAdapterStepInput = {
  chosen: GitAdapterId
  baseUrl: string
  /** The Bitbucket username; "" when unset. */
  username: string
  /** Whether `gh` is installed and signed in. */
  cliReady: boolean
  /** The adapters that have a credential stored. */
  hasToken: ReadonlySet<GitAdapterId>
  host: Host
}

export type Action = { id: string; label: string; primary?: boolean }

/** One agent's panel inside a tabbed step. */
export type Tab = {
  id: string
  label: string
  /** Short state word beside the tab label. */
  badge: string
  detail: string
  /** What the path underneath it is. Never show a path without one. */
  pathCaption?: string
  path?: string
  snippet?: string
  /**
   * A short Markdown guide, shipped in `resources/git-adapter`.
   *
   * A file rather than strings in this module, because it is prose: the exact
   * scopes a token needs are the part people get wrong, and getting them wrong
   * fails at read time with an opaque 403 rather than here. Prose belongs
   * somewhere it can be written and reviewed as prose.
   */
  guide?: string
  actions: Action[]
}

export type Step = {
  id: string
  title: string
  status: "done" | "todo" | "optional"
  detail: string
  pathCaption?: string
  path?: string
  warning?: string
  snippet?: string
  actions: Action[]
  /** Present when the step is one choice among several, one panel per tab. */
  tabs?: Tab[]
  /** Tab to open first: the agent most likely to be the user's. */
  activeTab?: string
}

/** The configuration surface, as the settings screen draws it. */
export type Config = {
  profiles: string[]
  active: string
  editable: boolean
  groups: ConfigGroup[]
}

export type State = {
  lede: string
  steps: Step[]
  footer: string
  complete: boolean
  /** The How to use guide, as Markdown, read from this extension's resources. */
  guide: string
  /** The configuration surface that replaces the How to use guide. */
  config: Config
}

/**
 * "Show folder", but only where a folder can be shown.
 *
 * `revealFileInOS` opens the desktop file manager on the machine running the
 * *window*, while these paths are on the machine running the *extension*. In a
 * remote window those are different computers, so the button would either fail
 * or, worse, open a path that happens to exist locally and mean something else.
 */
export function locate(host: Host): Action[] {
  return !host.remote
    ? [{ id: "reveal", label: "Show folder" }]
    : [{ id: "copyPath", label: "Copy path" }]
}

export function tabFor(
  agent: AgentState,
  installed: boolean,
  pluginDir: string,
  host: Host,
): Tab {
  if (agent.id === "claude-code") {
    return {
      id: agent.id,
      label: agent.name,
      badge: installed ? "ready" : "waiting",
      detail: installed
        ? "Nothing more to do. What you installed is a Claude Code plugin, so " +
          "the four /flightplan: commands and the tools behind them are already " +
          "pointed at the server VS Code is running. Restart Claude Code if it " +
          "was open when you installed."
        : "Nothing to configure here. Step 1 installs a Claude Code plugin, and " +
          "that is all the setting up Claude Code needs.",
      // The plugin's own .mcp.json declares the server, so this is the one agent
      // where the address is invisible. Name the file so it stays findable.
      pathCaption: installed ? "Declared for you in:" : undefined,
      path: installed ? path.join(pluginDir, ".mcp.json") : undefined,
      actions: [],
    }
  }

  if (agent.id === "other") {
    return {
      id: agent.id,
      label: agent.name,
      badge: "manual",
      detail:
        "Any tool that supports MCP can use Flight Plan. Add the entry below to " +
        "wherever it keeps its MCP servers, adjusting the shape to match. The " +
        "skills are plain Markdown in the same folder, so a tool with its own " +
        "skill format can be given those too.",
      snippet: agent.snippet,
      actions: agent.snippet === "" ? [] : [{ id: "copy", label: "Copy snippet" }],
    }
  }

  if (!agent.present) {
    return {
      id: agent.id,
      label: agent.name,
      badge: "not found",
      detail:
        `${agent.name} does not appear to be installed on ${host.machine}. ` +
        `Nothing to do here unless you install it later, in which case come ` +
        `back to this tab.`,
      actions: [],
    }
  }

  if (agent.registered) {
    return {
      id: agent.id,
      label: agent.name,
      badge: "ready",
      detail: `Done. ${agent.name} can use Flight Plan's tools. Restart it if it was running when you set this up.`,
      pathCaption: `${agent.name} keeps its configuration in:`,
      path: agent.file,
      actions: [],
    }
  }

  return {
    id: agent.id,
    label: agent.name,
    badge: "not connected",
    detail: agent.automatic
      ? `Press the button and Flight Plan adds itself to ${agent.name}'s ` +
        `configuration. It only adds; nothing already in that file is changed. ` +
        `Restart ${agent.name} afterwards.`
      : `Copy this into ${agent.name}'s configuration yourself, then restart it. ` +
        `Flight Plan will not edit this file for you: its exact format has not ` +
        `been confirmed, and a wrong guess would break a file you rely on.`,
    pathCaption: `${agent.name} keeps its configuration in:`,
    path: agent.file,
    snippet: agent.snippet,
    actions:
      agent.snippet === ""
        ? []
        : agent.automatic
          ? [
              { id: "register", label: `Add to ${agent.name}`, primary: true },
              { id: "copy", label: "Copy snippet" },
            ]
          : [{ id: "copy", label: "Copy snippet", primary: true }],
  }
}

/**
 * The server, its port, and what VS Code will try to do with that port.
 *
 * Its own step rather than a line inside "connect your agent", because the port
 * is the one thing here somebody may have to change for reasons of their own,
 * and because on a remote VS Code will interrupt them about it.
 */
export function serverStep(
  url: string | null,
  port: number | null,
  installed: boolean,
  wanted: number,
  error: string | null,
  host: Host,
  /** Whether VS Code has been told not to auto-forward the bound port. */
  forwardingIgnored: boolean,
): Step {
  // The port is already on screen above this button whenever there is one, so
  // repeating it in the label is noise. The wording only changes for the case
  // where no port has been chosen or bound yet and there is nothing to show.
  const changePort: Action = {
    id: "changePort",
    label: port === null && wanted === 0 ? "Choose a port" : "Change port",
  }

  // Changeable in every state. The case that most needs it is a server that
  // would not start because its port was taken, and a step with no actions
  // would be a dead end exactly there.
  if (url === null || port === null) {
    if (!installed) {
      return {
        id: "server",
        title: "Run the tools",
        status: "todo",
        detail:
          "VS Code runs one server that every agent shares. It starts once " +
          "Flight Plan is installed. You can pick its port now or leave it to " +
          "choose one.",
        pathCaption: wanted === 0 ? undefined : "Port to use:",
        path: wanted === 0 ? undefined : String(wanted),
        actions: [changePort],
      }
    }
    return {
      id: "server",
      title: "Run the tools",
      status: "todo",
      detail:
        error === null
          ? "The server is not running. Start it, or pick a different port first."
          : `The server did not start. ${error}`,
      pathCaption: wanted === 0 ? undefined : "Port it tried:",
      path: wanted === 0 ? undefined : String(wanted),
      actions: [{ id: "start", label: "Start", primary: true }, changePort],
    }
  }

  const remote = host.remote
  const ignored = forwardingIgnored
  const actions: Action[] = [changePort]
  if (remote && !ignored) {
    actions.push({ id: "ignorePort", label: "Stop VS Code forwarding it" })
  }

  const forwarding = !remote
    ? ""
    : ignored
      ? " VS Code has been told to leave this port alone."
      : " On this remote, VS Code will offer to forward the port to your laptop. " +
        "Nothing needs it: the agents run here, beside the server."

  return {
    id: "server",
    title: "Run the tools",
    status: "done",
    detail:
      `Running on port ${port}, bound to this machine only. It is remembered, ` +
      `so agents keep working across restarts, and it stops when VS Code does.` +
      forwarding,
    pathCaption: "Port:",
    path: String(port),
    actions,
  }
}

/**
 * One step, one tab per agent.
 *
 * Tabs rather than a step each, because most people use one agent and a stacked
 * list of four would read as four things to do. The tab that opens first is the
 * one most likely to be theirs: an agent already connected, else one that is
 * installed but not connected, else Claude Code.
 */
export function connectStep(
  agents: AgentState[],
  installed: boolean,
  url: string | null,
  pluginDir: string,
  host: Host,
): Step {
  const tabs = agents.map((agent) => tabFor(agent, installed, pluginDir, host))
  const connected = agents.find((agent) => agent.registered)
  const pending = agents.find(
    (agent) => agent.present && !agent.registered && agent.id !== "other",
  )

  return {
    id: "connect",
    title: "Connect your agent",
    // Stated once, above the tabs: it is the same address for every agent, and
    // somebody looking for "where is the server" should not have to open a tab
    // to find it. Captioned, because a bare URL says nothing about what it is.
    pathCaption:
      url === null
        ? undefined
        : `Agents reach Flight Plan here. ${host.machine} only, and only while VS Code is open:`,
    path: url ?? undefined,
    // Never blocks completion. Which agents someone uses is their business, and
    // an unconnected Codex is not an unfinished setup.
    status: connected === undefined ? "optional" : "done",
    detail:
      "Your coding agent has to be told that Flight Plan's tools exist. Pick " +
      "your agent below and follow that one tab; you only need the agent you " +
      "actually use, and you can come back for another later. VS Code runs the " +
      "tools for all of them, so they are available while VS Code is open and " +
      "not otherwise." +
      (!host.remote
        ? ""
        : " On a remote workspace VS Code may offer to forward this port to " +
          "your laptop. You can decline: the agents run on the same machine as " +
          "the server and do not need it forwarded."),
    actions: url === null ? [] : [{ id: "copyServer", label: "Copy address" }],
    tabs,
    activeTab: (connected ?? pending)?.id ?? "claude-code",
  }
}

/**
 * How Flight Plan reaches the code host, as one step with a tab per option.
 *
 * Tabs rather than a step each, for the same reason "connect your agent" has
 * them: most people use one host, and a stacked list of five would read as five
 * things to do. The tab that opens first is the one currently chosen.
 *
 * What each option cannot do is generated from its capability set rather than
 * written out, so the prose here cannot drift away from the behaviour.
 */
export function gitAdapterStep(input: GitAdapterStepInput, guides: Map<GitAdapterId, string>): Step {
  const { chosen, cliReady } = input
  const url = input.baseUrl

  const tabs: Tab[] = []
  for (const id of GIT_ADAPTER_IDS) {
    const hasToken = id !== "git" && input.hasToken.has(id)
    const selected = id === chosen

    /*
     * Two words at most.
     *
     * It renders in a tab header beside the label, in a badge whose variant is
     * built for a number. "not signed in" pushed the label out of its own tab.
     * Whatever the state, it has to fit: "sign in" says the same thing in the
     * space available.
     */
    const badge =
      id === "git"
        ? selected
          ? "in use"
          : "ready"
        : id === "gh"
          ? cliReady
            ? selected
              ? "in use"
              : "ready"
            : "sign in"
          : hasToken
            ? selected
              ? "in use"
              : "ready"
            : "no token"

    const actions: Action[] = []
    if (selected) {
      actions.push({ id: "change", label: "Use something else" })
    } else {
      actions.push({ id: "use", label: "Use this", primary: true })
    }
    if (id !== "git" && id !== "gh") {
      actions.push({
        id: "token",
        label: hasToken ? "Replace token" : "Add token",
        primary: selected && !hasToken,
      })
      if (hasToken) actions.push({ id: "clearToken", label: "Remove token" })
    }
    if (id === "bitbucket") {
      actions.push({ id: "username", label: "Set email" })
    }
    if (id !== "git") {
      actions.push({
        id: "baseUrl",
        label: url === "" ? "Use a self-hosted instance" : "Change base URL",
      })
    }

    const host = url === "" ? CLOUD_HOSTS[id] : url
    tabs.push({
      id,
      label: GIT_ADAPTER_NAMES[id],
      badge,
      detail: detailFor(id, selected, hasToken, cliReady, input.host),
      pathCaption:
        id === "git"
          ? undefined
          : id === "bitbucket" && input.username !== ""
            ? input.username.includes("@")
              ? `As ${input.username} on:`
              : `${input.username} is not an email address. Reads from:`
            : "Reads from:",
      path: id === "git" ? undefined : (host ?? undefined),
      guide: guides.get(id),
      actions,
    })
  }

  return {
    id: "forge",
    title: "Choose how Flight Plan reaches your code host",
    // Never blocks completion. `git` is a working choice, not an unfinished
    // one: it is the default precisely because it needs nothing.
    status: chosen === "git" ? "optional" : "done",
    detail:
      `Flight Plan is using ${GIT_ADAPTER_NAMES[chosen]}. ` +
      (chosen === "git"
        ? "That needs nothing installed and reads your checkout, but it cannot " +
          "list pull requests or link into a diff. Change it below to turn " +
          "those on."
        : "Change it below if that is wrong. Each tab says how to get what it " +
          "needs."),
    /*
     * Changing is a button on the step, not only a tab you have to find.
     *
     * The tabs are how you read about an option; this is how you switch. They
     * are not the same job, and making the second a side effect of the first
     * left the option already in use with nothing to press at all — plain git
     * has no token and no base URL, so its tab rendered no buttons and the
     * step looked finished and locked.
     */
    actions: [{ id: "change", label: `Change from ${GIT_ADAPTER_NAMES[chosen]}` }],
    tabs,
    activeTab: chosen,
  }
}

/** What one option is, in a sentence, given the state it is actually in. */
export function detailFor(
  id: GitAdapterId,
  selected: boolean,
  hasToken: boolean,
  cliReady: boolean,
  host: Host,
): string {
  const inUse = selected ? "In use. " : ""
  switch (id) {
    case "git":
      return (
        `${inUse}Reads files, commits and diffs straight from the checkout on ` +
        `${host.machine}. No CLI, no token, no network. It cannot list pull ` +
        `requests, filter by review state or link into a ` +
        `diff, because none of those exist outside a code host.`
      )
    case "gh":
      return cliReady
        ? `${inUse}The GitHub CLI is installed and signed in on ${host.machine}. ` +
            `Nothing to paste: Flight Plan sees exactly what you can see.`
        : `The GitHub CLI is not signed in on ${host.machine}. Run ` +
            `\`gh auth login\` in a terminal, then reopen this view.`
    case "github":
      return hasToken
        ? `${inUse}Using a token from your keychain.`
        : "For a machine with no GitHub CLI. The token goes in your operating " +
            "system's keychain, never in a settings file."
    case "gitlab":
      return hasToken
        ? `${inUse}Using a token from your keychain.`
        : "Reads merge requests, their notes and their diffs. Needs a personal " +
            "access token with `read_api`."
    case "bitbucket":
      return hasToken
        ? `${inUse}Using an API token from your keychain. Read-only.`
        : "Reads pull requests, comments and diffs. Read-only: Flight Plan " +
            "never writes to Bitbucket. Bitbucket Data Center is not supported."
    default:
      return ""
  }
}

/** What the whole view is built from. */
export type StateInput = {
  /** The plugin directory. */
  plugin: string
  status: PluginStatus
  /** This extension's version. */
  current: string
  agents: AgentState[]
  /** The MCP URL, or null when the server is not up. */
  url: string | null
  gitAdapter: Step
  server: Step
  guide: string
  config: Config
  host: Host
}

/**
 * The setup view's state: the four steps in reading order, with the lede and
 * footer that depend on how many are left.
 */
export function assembleState(input: StateInput): State {
  const { plugin, status, current, agents, url, gitAdapter, server, guide, config, host } = input
  const steps: Step[] = []

  steps.push({
    id: "plugin",
    title: "Install Flight Plan's tooling",
    // Out of date counts as unfinished: the tools an agent can see are wrong.
    status: status.installed && status.version === current ? "done" : "todo",
    detail: status.installed
      ? status.version === current
        ? `Installed, version ${status.version}. The review skill and the ` +
          `Flight Plan MCP server, in one directory.`
        : // The commonest confusing failure: the extension updates, the copied
          // plugin does not, and an assistant reports a tool that "does not
          // exist" because its server is the old one. Say so here rather than
          // leaving it to be worked out from the agent's side.
          `Installed version ${status.version ?? "unknown"}, but this extension ` +
          `is ${current}. Reinstall to give your agents the current tools, then ` +
          `restart them: an assistant talking to the old server will report ` +
          `newer tools as missing.`
      : `Puts the review skill where Claude Code will find it, and the program ` +
        `behind Flight Plan's tools in a folder of its own, both on ` +
        `${host.machine}. Every agent shares that one program; the next step ` +
        `points yours at it.`,
    pathCaption: status.installed ? "Installed in:" : "Will be installed in:",
    path: plugin,
    warning:
      status.edited.length === 0
        ? undefined
        : `You have edited ${status.edited.length} file(s) here. Reinstalling replaces them: ${status.edited.join(", ")}`,
    actions: status.installed
      ? [
          {
            id: "install",
            label: status.version === current ? "Reinstall" : "Update",
            primary: status.version !== current,
          },
          ...locate(host),
          { id: "choose", label: "Change folder" },
        ]
      : [
          { id: "install", label: "Install", primary: true },
          { id: "choose", label: "Change folder" },
        ],
  })

  /*
   * Second, directly after installing.
   *
   * How Flight Plan reaches your code host decides what the review list can
   * show at all — whether there are pull requests in it. That belongs immediately after installing the
   * thing, not after three steps about agents and ports. The steps can be done
   * in any order, but the order they are read in is a claim about what matters.
   */
  steps.push(gitAdapter)
  steps.push(server)
  steps.push(connectStep(agents, status.installed, url, plugin, host))

  const outstanding = steps.filter((step) => step.status === "todo").length
  return {
    guide,
    config,
    lede:
      outstanding === 0
        ? "Everything Flight Plan needs is in place."
        : "A few things to set up. You can do them in any order, and come back later.",
    steps,
    footer:
      outstanding === 0
        ? "Ask Claude Code for /flightplan:review on a pull request you are reviewing. Restart Claude Code first if it was running when you installed."
        : "Reopen this any time with “Flight Plan: Open Setup”.",
    complete: outstanding === 0,
  }
}
