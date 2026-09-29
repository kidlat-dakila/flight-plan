import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

/**
 * Registering the MCP server with agents other than Claude Code.
 *
 * Claude Code needs nothing here: the plugin's own `.mcp.json` declares the
 * server, and installing the plugin is the whole job. Every other agent keeps
 * its MCP servers in a file of its own, in a format of its own, and that file
 * already contains the user's other configuration.
 *
 * Which is why nothing in this module rewrites a file it does not understand.
 * Codex is appended to, and only when Flight Plan is not already in it. Anything
 * whose format has not been verified gets a snippet to copy and an honest label
 * saying so. Silently reformatting somebody's agent configuration to save them a
 * paste is not a trade worth making.
 */

export type AgentId = "claude-code" | "codex" | "cursor" | "other"

export type AgentState = {
  id: AgentId
  name: string
  /** False when the agent does not appear to be installed on this machine. */
  present: boolean
  /** True when Flight Plan is already registered with it. */
  registered: boolean
  /** True when this extension can perform the registration itself. */
  automatic: boolean
  /** Configuration file, for display. Empty when there is no single file. */
  file: string
  /** What to paste, for the agents this extension will not write to. */
  snippet: string
}

function codexConfig(): string {
  return path.join(os.homedir(), ".codex", "config.toml")
}

function cursorConfig(): string {
  return path.join(os.homedir(), ".cursor", "mcp.json")
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.stat(target)
    return true
  } catch {
    return false
  }
}

/** TOML block registering the server. Codex has no plugin-root substitution. */
/**
 * Codex takes a `url`, verified against its own binary.
 *
 * `RawMcpServerConfig` carries `url`, `bearer_token`, `bearer_token_env_var` and
 * `http_headers` beside `command` and `args`, and the binary links
 * `rmcp::transport::streamable_http_client`. The token travels in the URL rather
 * than as a bearer token so that one string is all any client needs.
 */
export function codexSnippet(url: string): string {
  return ["[mcp_servers.flightplan]", `url = "${url}"`].join("\n")
}

export function cursorSnippet(url: string): string {
  return JSON.stringify({ mcpServers: { flightplan: { url } } }, null, 2)
}

const CODEX_SECTION = /^\[mcp_servers\.flightplan\]/m

/**
 * Generic instructions, for an MCP client this extension has never heard of.
 *
 * The step exists because the list of agents is not closeable. Anything that
 * speaks MCP over stdio can use Flight Plan, and the honest answer for those is
 * the command line rather than a config format guessed at from a distance.
 */
export function genericSnippet(url: string): string {
  return JSON.stringify(
    { mcpServers: { flightplan: { type: "http", url } } },
    null,
    2,
  )
}

export async function agentStates(
  url: string | null,
  claudeCodeInstalled: boolean,
): Promise<AgentState[]> {
  // With no server there is no address to hand out, and a snippet naming a URL
  // that answers nothing is worse than none.
  const address = url ?? ""
  const codexFile = codexConfig()
  const codexPresent = await exists(path.dirname(codexFile))
  const codexText = codexPresent
    ? await fs.readFile(codexFile, "utf8").catch(() => "")
    : ""

  const cursorFile = cursorConfig()
  const cursorPresent = await exists(path.join(os.homedir(), ".cursor"))
  const cursorText = cursorPresent
    ? await fs.readFile(cursorFile, "utf8").catch(() => "")
    : ""

  return [
    {
      id: "claude-code",
      name: "Claude Code",
      present: true,
      // Installing is registering. The directory copied in the previous step is
      // a Claude Code plugin, and its own `.mcp.json` declares the server, so
      // there is no second act for this agent and no config file to touch.
      registered: claudeCodeInstalled,
      automatic: true,
      file: "",
      snippet: "",
    },
    {
      id: "codex",
      name: "Codex",
      present: codexPresent,
      registered: CODEX_SECTION.test(codexText),
      automatic: true,
      file: codexFile,
      snippet: address === "" ? "" : codexSnippet(address),
    },
    {
      id: "cursor",
      name: "Cursor",
      present: cursorPresent,
      registered: cursorText.includes('"flightplan"'),
      // Format not verified against a real Cursor install, so this extension
      // will not write it. Showing a snippet that may be wrong is recoverable;
      // rewriting a config file on a guess is not.
      automatic: false,
      file: cursorFile,
      snippet: address === "" ? "" : cursorSnippet(address),
    },
    {
      id: "other",
      name: "Something else",
      present: true,
      // Nothing to detect and nothing to check: this tab is documentation.
      registered: false,
      automatic: false,
      file: "",
      snippet: address === "" ? "" : genericSnippet(address),
    },
  ]
}

export class RegistrationError extends Error {}

/**
 * Adds Flight Plan to Codex's config by appending, never by rewriting.
 *
 * `config.toml` holds the user's marketplaces, plugins, notify hooks and other
 * MCP servers. Parsing and re-emitting it would silently reorder and reformat
 * all of that. Appending a section leaves every existing byte untouched, which
 * is the only edit that is obviously safe.
 */
export async function registerWithCodex(url: string): Promise<void> {
  const file = codexConfig()
  const current = await fs.readFile(file, "utf8").catch(() => null)
  if (current === null) {
    throw new RegistrationError(
      "Codex's configuration file was not found. Start Codex once, then try again.",
    )
  }
  if (CODEX_SECTION.test(current)) {
    throw new RegistrationError(
      "Codex already has a flightplan server. Edit it by hand if it points somewhere stale.",
    )
  }

  const separator = current.endsWith("\n") ? "\n" : "\n\n"
  const block = codexSnippet(url)
  await fs.writeFile(file, `${current}${separator}${block}\n`, "utf8")
}
