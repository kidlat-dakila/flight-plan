import type { TerminalApp } from "@/procedures/get-setup/utils/setup"

export type AgentTab
  = | { readonly terminalApp: "terminal", readonly windowId: number, readonly tty: string }
    | { readonly terminalApp: "iterm", readonly tty: string }
    | { readonly terminalApp: "ghostty", readonly terminalId: string, readonly ttyPath: string }
    | { readonly terminalApp: "warp", readonly ttyPath: string }

export type TerminalOpening
  = | { readonly kind: "opened", readonly tab: AgentTab | null, readonly isWindowFallback: boolean }
    | { readonly kind: "failed", readonly reason: string }

export type TerminalOpener = (command: string, terminalApp: TerminalApp) => Promise<TerminalOpening>

export type TerminalCloser = (tab: AgentTab) => Promise<void>
