export type TerminalOpening
  = | { readonly kind: "opened" }
    | { readonly kind: "failed", readonly reason: string }

export type TerminalOpener = (command: string) => Promise<TerminalOpening>
