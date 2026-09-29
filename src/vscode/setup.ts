import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as vscode from "vscode"
import { writeConfig } from "../api/mcp/config"
import {
  MARKER,
  defaultPluginLocation,
  digest,
  editedFiles,
  expandHome,
  listFiles,
  machineOf,
  mcpDeclaration,
  pruneWithdrawn,
  readRecord,
  refreshServerCopy,
  type InstallRecord,
  type Locations,
  type PluginStatus,
} from "./utils/setupInstall"
import { copyShippedInstructions } from "../lib/schemas/shippedInstructions"

/**
 * Puts Flight Plan's agent tooling where Claude Code will find it.
 *
 * Flight Plan ships as a **Claude Code plugin**, not as loose skills plus a
 * separate `claude mcp add`. A plugin directory carries the skills and the MCP
 * server registration together in one artifact, which gives three things the
 * earlier design had to work for:
 *
 * - the skills are addressed as `/flightplan:review`, the
 *   namespaced form, which loose skills in `~/.claude/skills` cannot produce
 * - the server is declared in the plugin's own `.mcp.json` with
 *   `${CLAUDE_PLUGIN_ROOT}`, so nothing shells out to register it and no
 *   absolute path is written into another application's configuration
 * - version lock is structural rather than promised: skills and server are in
 *   one directory, copied together, so a skill can never call a signature the
 *   installed server does not have
 *
 * Installing is therefore copying one directory. Uninstalling is removing it.
 */

function configured<T>(key: string): T | undefined {
  const value = vscode.workspace.getConfiguration("flightPlan").get<T>(key)
  return value === undefined || value === "" ? undefined : value
}

/**
 * Where everything lives, and which of it belongs to whom.
 *
 * The split matters. The **server is Flight Plan's**, so it goes in this
 * extension's own global storage, which is keyed by extension id and therefore
 * survives version updates. The **plugin directory is Claude Code's**, and holds
 * only what Claude Code understands: skills, a manifest, and a generated
 * `.mcp.json` that points at the server.
 *
 * An earlier version put the server inside the plugin directory, using
 * `${CLAUDE_PLUGIN_ROOT}` so no absolute path appeared in Claude's config. That
 * was wrong in three ways, all of which bite as soon as a second agent exists:
 * uninstalling the Claude plugin deleted the server Codex was pointing at;
 * Codex was reading an executable out of Claude Code's skills folder, which is
 * nonsense; and moving the plugin location silently broke every other agent.
 * One server, one owner, one path, shared by all of them.
 */
export function locations(context: vscode.ExtensionContext): Locations {
  const plugin = expandHome(
    configured<string>("pluginLocation") ?? defaultPluginLocation(),
  )
  const storage = context.globalStorageUri.fsPath
  const server = path.join(storage, "server")
  return {
    plugin,
    server,
    serverFile: path.join(server, "mcp-server.mjs"),
    skills: path.join(plugin, "skills"),
    // Drafts are not user-facing.
    walkthroughs: path.join(storage, "walkthroughs"),
    plans: path.join(storage, "plans"),
  }
}

/**
 * The parsers, copied beside the server that loads them.
 *
 * The server is one standalone file with no `node_modules` at its destination,
 * so a `.wasm` it needs has to arrive as a file of its own. The loader,
 * `src/lib/codegraph/tracer/parse.ts`, looks for a `tree-sitter` directory
 * beside itself first, which is exactly here.
 *
 * Copied on every install rather than only when missing: a grammar is built
 * against a runtime ABI, and a half-upgraded pair — last version's grammars
 * beside this version's runtime — fails at load with nothing useful to say.
 * The directory is small enough that rewriting it costs nothing worth saving.
 */
async function copyGrammars(
  context: vscode.ExtensionContext,
  serverDirectory: string,
): Promise<void> {
  const from = path.join(context.extensionUri.fsPath, "resources", "tree-sitter")
  const to = path.join(serverDirectory, "tree-sitter")
  let names: string[]
  try {
    names = await fs.readdir(from)
  } catch {
    // Not packaged. The server then parses nothing and says so per file, which
    // is the same degraded path as a language nothing ships a grammar for.
    return
  }
  await fs.mkdir(to, { recursive: true })
  for (const name of names) {
    if (!name.endsWith(".wasm")) continue
    await fs.copyFile(path.join(from, name), path.join(to, name))
  }
}

/**
 * The instruction markdown, copied beside the server that reads it.
 *
 * The same reasoning as the grammars: the server is one file with nothing
 * beside it at its destination, so the `.md` files it serves to agents arrive
 * as files of their own, in `server/instructions/`. Replaced on every install,
 * so the server and its instructions are always from one version. Unlike a
 * missing grammar, a missing tree is an error: the server refuses to start
 * without it, so a broken package fails here, where setup can say so.
 */
function copyInstructions(context: vscode.ExtensionContext, serverDirectory: string): void {
  copyShippedInstructions(
    path.join(context.extensionUri.fsPath, "dist", "instructions"),
    path.join(serverDirectory, "instructions"),
  )
}

/** What the setup view shows for the Claude Code step. */
/**
 * Brings an installed server up to this extension's version, with its
 * grammars and instructions. True when it changed anything. See `refreshServerCopy`.
 */
export async function refreshServer(context: vscode.ExtensionContext): Promise<boolean> {
  const where = locations(context)
  const bundled = path.join(context.extensionUri.fsPath, "dist", "mcp-server.mjs")
  const refreshed = await refreshServerCopy(bundled, where.serverFile)
  if (refreshed) {
    await copyGrammars(context, where.server)
    copyInstructions(context, where.server)
  }
  return refreshed
}

export async function pluginStatus(
  context: vscode.ExtensionContext,
): Promise<PluginStatus> {
  const { plugin } = locations(context)
  const record = await readRecord(plugin)
  if (record === null) {
    return { installed: false, version: null, edited: [], location: plugin }
  }
  return {
    installed: true,
    version: record.version,
    edited: await editedFiles(plugin, record),
    location: plugin,
  }
}

/** Copies the bundled plugin plus the built server, recording what it wrote. */
async function copyPlugin(
  context: vscode.ExtensionContext,
  where: Locations,
  url: string | null,
): Promise<InstallRecord> {
  const destination = where.plugin
  const source = path.join(context.extensionUri.fsPath, "plugin")
  const previous = await readRecord(destination)
  const written: Record<string, string> = {}

  const write = async (target: string, content: Buffer | string, key: string) => {
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content)
    written[key] = digest(Buffer.from(content))
  }

  for (const relative of await listFiles(source)) {
    const content = await fs.readFile(path.join(source, relative))
    await write(path.join(destination, relative), content, relative)
  }

  // Only once the server is up, because the URL is not known before that. A
  // reinstall while it is down leaves the previous declaration alone rather
  // than replacing it with a broken one.
  if (url !== null) {
    await write(path.join(destination, ".mcp.json"), mcpDeclaration(url), ".mcp.json")
  }

  // The server is Flight Plan's, not Claude Code's, so it is written to this
  // extension's own storage and merely referenced from the plugin.
  const server = await fs.readFile(
    path.join(context.extensionUri.fsPath, "dist", "mcp-server.mjs"),
  )
  await fs.mkdir(where.server, { recursive: true })
  await fs.writeFile(where.serverFile, server)
  await copyGrammars(context, where.server)
  copyInstructions(context, where.server)

  await pruneWithdrawn(destination, previous, written)

  const version =
    (context.extension.packageJSON as { version?: string }).version ?? "0.0.0"
  const record: InstallRecord = {
    version,
    installedAt: new Date().toISOString(),
    files: written,
  }
  await fs.writeFile(
    path.join(destination, MARKER),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  )
  return record
}

/**
 * Installs without asking.
 *
 * The confirmation belongs to whoever calls this: the setup view asks in its own
 * flow, and the command asks with a modal. Putting the dialog in here would mean
 * two prompts for one action.
 */
export async function installPlugin(
  context: vscode.ExtensionContext,
  url: string | null,
): Promise<string> {
  const where = locations(context)
  await fs.mkdir(where.walkthroughs, { recursive: true })
  await fs.mkdir(where.plans, { recursive: true })
  await copyPlugin(context, where, url)
  // Beside the server, where it finds itself, and read on every call. Not in a
  // registration line, so changing a location later needs no agent touched.
  // Beside the server, where it finds itself, and read on every call. Not in a
  // registration line, so changing a location later needs no agent touched.
  await writeConfig(where.server, {
    version: 1,
    walkthroughRoot: where.walkthroughs,
    planRoot: where.plans,
  })

  return where.plugin
}

/** Removes an installation this extension made. Returns false if it made none. */
export async function removePlugin(
  context: vscode.ExtensionContext,
): Promise<boolean> {
  const { plugin } = locations(context)
  if ((await readRecord(plugin)) === null) return false
  await fs.rm(plugin, { recursive: true, force: true })
  return true
}

/** Names the machine a path is on, for a user who may have two. */
export function machineName(): string {
  return machineOf(vscode.env.remoteName)
}

export async function removeAgentTooling(
  context: vscode.ExtensionContext,
): Promise<void> {
  const { plugin } = locations(context)

  // Only remove a directory this extension wrote. Without the marker it belongs
  // to someone else, and deleting it would be unforgivable.
  if ((await readRecord(plugin)) === null) {
    void vscode.window.showWarningMessage(
      `Flight Plan did not install anything at ${plugin}, so nothing was removed.`,
    )
    return
  }

  const choice = await vscode.window.showWarningMessage(
    "Remove Flight Plan's Claude Code plugin?",
    {
      modal: true,
      detail:
        `${plugin}\n\nOn ${machineName()}. Walkthroughs and plans are stored ` +
        `elsewhere and are not touched.`,
    },
    "Remove",
  )
  if (choice !== "Remove") return

  await removePlugin(context)
  void vscode.window.showInformationMessage(
    "Flight Plan's plugin was removed. Restart Claude Code to unload it.",
  )
}
