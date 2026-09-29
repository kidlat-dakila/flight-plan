import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { StorageConfig } from "./storage"

/**
 * How the server learns where documents live.
 *
 * A file beside the server in global storage, written by the extension. Not an
 * argument and not an environment variable, because both are baked into the
 * `claude mcp add` registration: changing a storage location would then mean
 * re-registering the server, and a stale registration is a failure nobody would
 * think to look for.
 *
 * The server reads it on every call rather than at startup, so a location
 * changed in Settings takes effect without restarting anything.
 */

export const CONFIG_FILE = "flightplan.json"

export type ServerConfig = StorageConfig & { version: 1 }

export function configPath(serverDirectory: string): string {
  return path.join(serverDirectory, CONFIG_FILE)
}

export async function writeConfig(
  serverDirectory: string,
  config: ServerConfig,
): Promise<void> {
  await fs.mkdir(serverDirectory, { recursive: true })
  await fs.writeFile(
    configPath(serverDirectory),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  )
}

export class ConfigError extends Error {}

export async function readConfig(serverDirectory: string): Promise<ServerConfig> {
  let raw: string
  try {
    raw = await fs.readFile(configPath(serverDirectory), "utf8")
  } catch {
    throw new ConfigError(
      "Flight Plan is not set up yet. Run \"Flight Plan: Open Setup\" " +
        "from the VS Code command palette.",
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ConfigError(
      "Flight Plan's configuration is unreadable. Run \"Flight Plan: Set Up " +
        "Agent Tooling\" again to rewrite it.",
    )
  }

  const config = parsed as Partial<ServerConfig>
  // A `wikiRoot` written by an older setup is ignored: wikis are gone, and
  // the file is not incomplete for still naming one.
  if (typeof config.walkthroughRoot !== "string") {
    throw new ConfigError(
      "Flight Plan's configuration is incomplete. Run \"Flight Plan: Set Up " +
        "Agent Tooling\" again to rewrite it.",
    )
  }

  return {
    version: 1,
    walkthroughRoot: config.walkthroughRoot,
    // Defaulted rather than required, because plans arrived after the first
    // release and a configuration file written before them is not incomplete,
    // it is older. Refusing it would break every existing install until setup
    // was run again, to tell them a location they never chose.
    planRoot:
      typeof config.planRoot === "string"
        ? config.planRoot
        : path.join(serverDirectory, "..", "plans"),
  }
}
