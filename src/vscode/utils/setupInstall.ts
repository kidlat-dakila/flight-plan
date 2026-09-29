import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

/**
 * The parts of installing the agent tooling that need no VS Code: where the
 * plugin goes by default, the install record, and the files an install wrote.
 * `src/vscode/setup.ts` does the copying with the extension's own paths.
 */

/** Records what this extension wrote, so an update can tell edits from copies. */
export const MARKER = ".flightplan-install.json"

export type InstallRecord = {
  version: string
  installedAt: string
  /** sha256 of every file this extension wrote, keyed by relative path. */
  files: Record<string, string>
}

export function digest(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

/** Default destination. A plugin directory here auto-loads with no registration. */
export function defaultPluginLocation(): string {
  return path.join(os.homedir(), ".claude", "skills", "flightplan")
}

export function expandHome(target: string): string {
  return target.startsWith("~")
    ? path.join(os.homedir(), target.slice(1))
    : target
}

export type Locations = {
  /** Claude Code plugin directory: skills, and a generated `.mcp.json`. */
  plugin: string
  /** Flight Plan's own directory: the server and its configuration. */
  server: string
  /** The bundled server. The extension runs this; agents never name it. */
  serverFile: string
  /** The skills, as editable Markdown. */
  skills: string
  walkthroughs: string
  /** Implementation plans. */
  plans: string
}

/** Every file under `root`, as paths relative to it. */
export async function listFiles(root: string, prefix = ""): Promise<string[]> {
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true })
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) found.push(...(await listFiles(root, relative)))
    else found.push(relative)
  }
  return found
}

export async function readRecord(destination: string): Promise<InstallRecord | null> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(destination, MARKER), "utf8"),
    ) as InstallRecord
  } catch {
    return null
  }
}

/**
 * Files the user has changed since the last install.
 *
 * The skills track the tool contract, so overwriting them is right. Doing it
 * silently is not: someone who tuned a skill deserves to be told it is going.
 */
export async function editedFiles(
  destination: string,
  record: InstallRecord,
): Promise<string[]> {
  const edited: string[] = []
  for (const [relative, hash] of Object.entries(record.files)) {
    try {
      const current = await fs.readFile(path.join(destination, relative))
      if (digest(current) !== hash) edited.push(relative)
    } catch {
      // Deleted rather than edited. Replacing it is what the user asked for.
    }
  }
  return edited
}

export type PluginStatus = {
  installed: boolean
  /** Extension version recorded at install time. */
  version: string | null
  /** Files the user changed since the last install. */
  edited: string[]
  location: string
}

/**
 * The plugin's MCP declaration, generated rather than shipped.
 *
 * Generated because both halves of it are decided here: the server's absolute
 * path, which is inside this extension's storage rather than inside the plugin,
 * and the node binary to run it with, which is resolved for the machine the
 * agent will run on. Shipping a static file would mean hardcoding one or both.
 *
 * This is also what "managed by the extension" means in practice. The extension
 * owns the server file, its location and its upgrades, and writes every agent's
 * registration. The agent only runs it.
 */
export function mcpDeclaration(url: string): string {
  return `${JSON.stringify(
    { mcpServers: { flightplan: { type: "http", url } } },
    null,
    2,
  )}\n`
}

/**
 * Removes files a previous install wrote that this one no longer ships.
 *
 * Copying over the destination is not enough. A skill that is withdrawn — as
 * the update tool was, once one skill covered a pull request — stays on
 * disk for everybody who already installed, and Claude Code keeps offering it.
 * The withdrawn skill then points at slash commands that no longer exist, which
 * is worse than either having it or not.
 *
 * Driven off the previous install record rather than off the directory, so it
 * can only ever delete files this extension put there. A skill somebody wrote
 * themselves is not in the record and is not touched.
 */
export async function pruneWithdrawn(
  destination: string,
  before: InstallRecord | null,
  after: Record<string, string>,
): Promise<string[]> {
  if (before === null) return []
  const gone = Object.keys(before.files).filter((key) => !(key in after))
  const removed: string[] = []
  for (const key of gone) {
    try {
      await fs.rm(path.join(destination, key), { force: true })
      removed.push(key)
    } catch {
      // A file the user already deleted or made unreadable. Nothing to undo.
    }
  }
  // Then the directories those files left empty, deepest first so a skill
  // folder goes once its `SKILL.md` has.
  const directories = [...new Set(gone.map((key) => path.dirname(key)))]
    .filter((relative) => relative !== "." && relative !== "")
    .sort((a, b) => b.length - a.length)
  for (const relative of directories) {
    try {
      await fs.rmdir(path.join(destination, relative))
    } catch {
      // Not empty, so something else lives there. Leave it.
    }
  }
  return removed
}

/**
 * Names the machine a path is on, which is ambiguous the moment there are two.
 *
 * Every path in this extension resolves on the machine the *extension host* runs
 * on, not the one showing the window. Attached to a remote workspace over SSH
 * those are different computers, and "the plugin is in ~/plugin" then means nothing
 * on its own. `remoteName` (`vscode.env.remoteName`, passed in) is the only
 * thing that can tell them apart.
 */
export function machineOf(remote: string | undefined): string {
  if (remote === undefined) return "this machine"
  const named: Record<string, string> = {
    "ssh-remote": "the SSH workspace",
    "dev-container": "the dev container",
    "attached-container": "the attached container",
    wsl: "WSL",
    codespaces: "the codespace",
  }
  return named[remote] ?? `the ${remote} remote`
}

/**
 * Replaces the installed server with the one this extension ships, when they
 * differ. True when it wrote.
 *
 * The extension runs the installed copy, not its own `dist/mcp-server.mjs`,
 * and only Install or Reinstall used to write that copy. So an upgraded
 * extension kept running the previous server until somebody pressed
 * Reinstall — and since the panel reads everything from the server's HTTP
 * API, an older server left every review panel empty. The server is
 * Flight Plan's own file, never edited by a person, so it is refreshed on
 * every start without asking. The skills are not: they may hold edits, and
 * the setup view asks before it replaces them.
 *
 * A missing copy is left missing: installing is the setup view's job.
 */
export async function refreshServerCopy(bundled: string, installed: string): Promise<boolean> {
  const current = await fs.readFile(installed).catch(() => null)
  if (current === null) return false
  const shipped = await fs.readFile(bundled)
  if (current.equals(shipped)) return false
  await fs.writeFile(installed, shipped)
  return true
}
