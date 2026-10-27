import type { TerminalApp } from "./setup"

export const TERMINAL_APP_LABELS: Record<TerminalApp, string> = {
  terminal: "Terminal",
  iterm: "iTerm2",
  ghostty: "Ghostty",
  warp: "Warp",
}

export const TERMINAL_APP_BUNDLES: Record<TerminalApp, string> = {
  terminal: "Terminal.app",
  iterm: "iTerm.app",
  ghostty: "Ghostty.app",
  warp: "Warp.app",
}
