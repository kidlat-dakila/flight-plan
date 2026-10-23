export interface TerminalWindow {
  readonly windowId: number
  readonly tty: string
}

export type TerminalOpening
  = | { readonly kind: "opened", readonly window: TerminalWindow | null }
    | { readonly kind: "failed", readonly reason: string }

export type TerminalOpener = (command: string) => Promise<TerminalOpening>

export type TerminalCloser = (window: TerminalWindow) => Promise<void>
