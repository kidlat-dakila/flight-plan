import { parseArgs } from "node:util"
import { parsePort, PUBLISHED_PORT } from "./config"

export type Command
  = | { readonly kind: "launch", readonly port: number | null, readonly shouldOpenBrowser: boolean }
    | { readonly kind: "help" }
    | { readonly kind: "version" }
    | { readonly kind: "invalid", readonly message: string }

export const HELP_TEXT = [
  "Usage: flightplan [options]",
  "",
  "Starts Flight Plan on this machine and opens it in the browser.",
  "If Flight Plan is already running, it only opens the browser.",
  "",
  "Options:",
  `  --port <number>  Listen on this port instead of ${String(PUBLISHED_PORT)}`,
  "  --no-open        Do not open the browser",
  "  -v, --version    Print the version",
  "  -h, --help       Print this help",
].join("\n")

const OPTIONS = {
  "port": { type: "string" },
  "no-open": { type: "boolean" },
  "version": { type: "boolean", short: "v" },
  "help": { type: "boolean", short: "h" },
} as const

const INVALID_PORT_MESSAGE = "--port takes a number between 1 and 65535."
const UNKNOWN_ARGUMENTS_MESSAGE = "The arguments were not understood."

const invalid = (message: string): Command => ({ kind: "invalid", message })

const launchCommandOf = (rawPort: string | undefined, isBrowserOff: boolean): Command => {
  const port = rawPort === undefined ? null : parsePort(rawPort)
  if (rawPort !== undefined && port === null) return invalid(INVALID_PORT_MESSAGE)
  return { kind: "launch", port, shouldOpenBrowser: !isBrowserOff }
}

export const parseCommand = (commandArguments: readonly string[]): Command => {
  try {
    const { values } = parseArgs({ args: [...commandArguments], options: OPTIONS, allowPositionals: false })
    if (values.help === true) return { kind: "help" }
    if (values.version === true) return { kind: "version" }
    return launchCommandOf(values.port, values["no-open"] === true)
  } catch (error) {
    return invalid(error instanceof Error ? error.message : UNKNOWN_ARGUMENTS_MESSAGE)
  }
}
