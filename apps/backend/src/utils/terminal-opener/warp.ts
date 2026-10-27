import { join } from "node:path"
import type { TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"

const WARP_FOLDER_NAME = ".warp"
const TAB_CONFIGS_FOLDER_NAME = "tab_configs"
const TAB_CONFIG_NAME = "flightplan"
const TAB_CONFIG_TITLE = "Flight Plan"
const AGENT_PANE_ID = "agent"

export const WARP_TAB_CONFIG_URL = `warp://tab_config/${TAB_CONFIG_NAME}`

const tomlStringOf = (text: string): string => JSON.stringify(text)

export const warpTabConfigPathOf = (homePath: string): string =>
  join(homePath, WARP_FOLDER_NAME, TAB_CONFIGS_FOLDER_NAME, `${TAB_CONFIG_NAME}.toml`)

export const warpTabConfigOf = (command: string): string => [
  `name = ${tomlStringOf(TAB_CONFIG_TITLE)}`,
  "",
  "[[panes]]",
  `id = ${tomlStringOf(AGENT_PANE_ID)}`,
  "type = \"terminal\"",
  `commands = [${tomlStringOf(command)}]`,
  "is_focused = true",
  "",
].join("\n")

export const warpOpeningOf = (ttyPath: string): TerminalOpening => ({ kind: "opened", tab: { terminalApp: "warp", ttyPath }, isWindowFallback: false })
