import { buildConfigGroups } from "../../../lib/schemas/configView"
import { DEFAULT_SECTIONS, defaultRead, descriptionRead } from "../../../lib/schemas/defaultProfile"
import { GIT_ADAPTER_IDS } from "../../../utils/git-adapter/helpers/assemble"
import type { GitAdapterId } from "../../../lib/git-adapter/types"
import type { AgentState } from "../../../utils/setup/agents"
import { assembleState, gitAdapterStep, serverStep, type Config, type Host, type State } from "../../../utils/setup/state"

/**
 * The setup page's states, for `/setup` in a browser.
 *
 * Built with the same builders the extension uses (`assembleState`,
 * `gitAdapterStep`, `serverStep`), from invented facts: no real path, no real
 * port, no real token. In VS Code the extension gathers the real facts and
 * builds the state itself, because the setup view must work before the
 * server it installs is running.
 */

export const SETUP_SAMPLES = ["outdated", "fresh", "ready", "failed", "remote"] as const
export type SetupSample = (typeof SETUP_SAMPLES)[number]

export function isSetupSample(name: string): name is SetupSample {
  return (SETUP_SAMPLES as readonly string[]).includes(name)
}

/** The extension version the samples are "running". */
export const SETUP_SAMPLE_VERSION = "1.4.0"

const PLUGIN = "/home/grace/.flightplan/plugin"
const PORT = 4100
const URL = `http://127.0.0.1:${String(PORT)}/mcp/0f3a9c2e7b1d4f6a8c5e2b9d7a1f3c4e`
const LOCAL: Host = { machine: "this machine", remote: false }
const REMOTE: Host = { machine: "the SSH workspace", remote: true }

const GUIDE = [
  "## Reviewing a pull request",
  "",
  "Open the pull request in the **Review Flight Plans** list, then ask your assistant for",
  "`/flightplan:review`. The walkthrough opens beside the code while it is written.",
  "",
  "## Planning a change",
  "",
  "Ask your assistant for a plan. It proposes code at a named position in each file,",
  "and the plan opens in the same panel.",
].join("\n")

const GIT_ADAPTER_GUIDES = new Map<GitAdapterId, string>(
  GIT_ADAPTER_IDS.map((id) => [id, `Flight Plan reads pull requests from **${id}** with read-only access.`]),
)

function agents(input: { url: string | null; installed: boolean; codex: boolean; cursor: boolean }): AgentState[] {
  const address = input.url ?? ""
  return [
    { id: "claude-code", name: "Claude Code", present: true, registered: input.installed, automatic: true, file: "", snippet: "" },
    {
      id: "codex",
      name: "Codex",
      present: true,
      registered: input.codex,
      automatic: true,
      file: "/home/grace/.codex/config.toml",
      snippet: address === "" ? "" : `[mcp_servers.flightplan]\nurl = "${address}"`,
    },
    {
      id: "cursor",
      name: "Cursor",
      present: input.cursor,
      registered: false,
      automatic: false,
      file: "/home/grace/.cursor/mcp.json",
      snippet: address === "" ? "" : `{ "mcpServers": { "flightplan": { "url": "${address}" } } }`,
    },
    {
      id: "other",
      name: "Something else",
      present: true,
      registered: false,
      automatic: false,
      file: "",
      snippet: address === "" ? "" : address,
    },
  ]
}

function config(custom: boolean): Config {
  const sections = custom ? { ...DEFAULT_SECTIONS, blast: false } : DEFAULT_SECTIONS
  return {
    profiles: custom ? ["default", "team"] : ["default"],
    active: custom ? "team" : "default",
    editable: custom,
    groups: buildConfigGroups(defaultRead, descriptionRead, sections),
  }
}

type Facts = {
  host: Host
  installed: boolean
  version: string | null
  edited: string[]
  running: boolean
  error: string | null
  forwardingIgnored: boolean
  gitAdapter: GitAdapterId
  cliReady: boolean
  tokens: GitAdapterId[]
  username: string
  codex: boolean
  cursor: boolean
  custom: boolean
}

function build(facts: Facts): State {
  const url = facts.running ? URL : null
  const port = facts.running ? PORT : null
  return assembleState({
    plugin: PLUGIN,
    status: { installed: facts.installed, version: facts.version, edited: facts.edited, location: PLUGIN },
    current: SETUP_SAMPLE_VERSION,
    agents: agents({ url, installed: facts.installed, codex: facts.codex, cursor: facts.cursor }),
    url,
    gitAdapter: gitAdapterStep(
      {
        chosen: facts.gitAdapter,
        baseUrl: "",
        username: facts.username,
        cliReady: facts.cliReady,
        hasToken: new Set(facts.tokens),
        host: facts.host,
      },
      GIT_ADAPTER_GUIDES,
    ),
    server: serverStep(url, port, facts.installed, PORT, facts.error, facts.host, facts.forwardingIgnored),
    guide: GUIDE,
    config: config(facts.custom),
    host: facts.host,
  })
}

const BASE: Facts = {
  host: LOCAL,
  installed: true,
  version: SETUP_SAMPLE_VERSION,
  edited: [],
  running: true,
  error: null,
  forwardingIgnored: false,
  gitAdapter: "gh",
  cliReady: true,
  tokens: [],
  username: "",
  codex: true,
  cursor: false,
  custom: false,
}

/** One setup state by name; `""` is the default, `outdated`. */
export function setupSample(name: string): State | null {
  const which = name === "" ? "outdated" : name
  if (!isSetupSample(which)) return null
  switch (which) {
    // The old harness fixture's case: a stale install with edited files, a
    // host that needs a token, and agents left to connect.
    case "outdated":
      return build({
        ...BASE,
        version: "1.3.2",
        edited: ["skills/review/SKILL.md", "skills/review/checklist.md"],
        gitAdapter: "github",
        cliReady: false,
        codex: false,
        cursor: true,
      })
    case "fresh":
      return build({ ...BASE, installed: false, version: null, running: false, gitAdapter: "git", cliReady: false, codex: false })
    case "ready":
      return build(BASE)
    case "failed":
      return build({ ...BASE, running: false, error: `The server did not start. Port ${String(PORT)} may already be in use.` })
    case "remote":
      return build({
        ...BASE,
        host: REMOTE,
        gitAdapter: "bitbucket",
        cliReady: false,
        tokens: ["bitbucket", "gitlab"],
        username: "grace-hopper",
        custom: true,
      })
  }
}
