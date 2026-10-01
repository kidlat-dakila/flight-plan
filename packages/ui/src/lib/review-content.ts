export type TokenKind
  = | "plain"
    | "keyword"
    | "string"
    | "number"
    | "comment"
    | "function"
    | "type"
    | "property"
    | "constant"
    | "tag"
    | "punctuation"

export interface CodeToken {
  readonly text: string
  readonly kind: TokenKind
}

export interface CodeLine {
  readonly numberLabel: string
  readonly mark: "context" | "added" | "removed"
  readonly isFocused: boolean
  readonly tokens: readonly CodeToken[]
}

export type Inline
  = | { readonly kind: "text", readonly text: string }
    | { readonly kind: "code", readonly text: string }
    | { readonly kind: "strong", readonly text: string }
    | { readonly kind: "code-link", readonly text: string, readonly isCode: boolean, readonly linkId: string | null }

export type ProseBlock
  = | { readonly kind: "paragraph", readonly inlines: readonly Inline[] }
    | { readonly kind: "list", readonly isOrdered: boolean, readonly items: readonly (readonly Inline[])[] }

export type ProseBlocks = readonly ProseBlock[]

export interface ForgeLink {
  readonly href: string
  readonly label: string
}

export interface CodeLinkTarget {
  readonly pathLabel: string
  readonly rangeLabel: string
  readonly lines: readonly CodeLine[]
  readonly anchorId: string | null
  readonly forgeLink: ForgeLink | null
}

export type CodeLinkTargets = Readonly<Record<string, CodeLinkTarget>>

export type FindingKind = "bug" | "risk" | "nit" | "question"

export interface Finding {
  readonly id: string
  readonly kind: FindingKind
  readonly kindLabel: string
  readonly title: readonly Inline[]
  readonly reading: ProseBlocks
  readonly traceLabel: string
  readonly trace: readonly (readonly Inline[])[] | null
  readonly solution: {
    readonly showLabel: string
    readonly hideLabel: string
    readonly lines: readonly CodeLine[]
  } | null
}
