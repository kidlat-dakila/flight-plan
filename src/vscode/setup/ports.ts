import * as vscode from "vscode"

/**
 * Stops VS Code offering to forward Flight Plan's port.
 *
 * On a remote, VS Code notices anything listening and offers to forward it to
 * the machine showing the window. For this server that offer is pure noise: the
 * agents run on the same machine as the server, so nothing needs forwarding, and
 * accepting would publish a file-writing endpoint to the laptop.
 *
 * `remote.autoForwardPorts` is a **boolean**, on or off for everything, so a
 * port cannot be "added" to it and turning it off would affect every dev server
 * the user runs. The per-port setting is `remote.portsAttributes`, keyed by port
 * number, whose `onAutoForward` accepts `ignore`.
 *
 * Only ever on request. This is the user's settings file, and an extension that
 * quietly rewrites port policy is an extension nobody trusts.
 */

const SETTING = "remote.portsAttributes"

type PortAttributes = { onAutoForward?: string; label?: string }

export const LABEL = "Flight Plan MCP"

export async function ignoreAutoForward(port: number): Promise<void> {
  const config = vscode.workspace.getConfiguration()
  const current = config.get<Record<string, PortAttributes>>(SETTING) ?? {}

  // Merged, never replaced: this object holds the user's rules for every other
  // port they work with.
  const next = {
    ...current,
    [String(port)]: { ...current[String(port)], onAutoForward: "ignore", label: LABEL },
  }
  await config.update(SETTING, next, vscode.ConfigurationTarget.Global)
}

/** True when the user has already told VS Code to leave this port alone. */
export function isAutoForwardIgnored(port: number): boolean {
  const current = vscode.workspace
    .getConfiguration()
    .get<Record<string, PortAttributes>>(SETTING)
  return current?.[String(port)]?.onAutoForward === "ignore"
}
