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

export interface ColumnSpan {
  readonly fromColumn: number
  readonly toColumn: number
}

export interface CodeLineReference extends ColumnSpan {
  readonly definitionId: string
}

export interface CodeLine {
  readonly numberLabel: string
  readonly removedNumberLabel: string
  readonly mark: "context" | "added" | "removed"
  readonly isFocused: boolean
  readonly tokens: readonly CodeToken[]
  readonly marks: readonly ColumnSpan[]
  readonly references: readonly CodeLineReference[]
}

export type Inline
  = | { readonly kind: "text", readonly text: string }
    | { readonly kind: "code", readonly text: string }
    | { readonly kind: "strong", readonly text: string }
    | { readonly kind: "emphasis", readonly text: string }
    | { readonly kind: "link", readonly text: string, readonly href: string }
    | { readonly kind: "code-link", readonly text: string, readonly isCode: boolean, readonly linkId: string | null }

export interface ProseListItem {
  readonly inlines: readonly Inline[]
  readonly blocks: readonly ProseBlock[]
}

export type ProseBlock
  = | { readonly kind: "heading", readonly inlines: readonly Inline[] }
    | { readonly kind: "paragraph", readonly inlines: readonly Inline[] }
    | { readonly kind: "list", readonly isOrdered: boolean, readonly items: readonly ProseListItem[] }
    | { readonly kind: "quote", readonly blocks: readonly ProseBlock[] }
    | { readonly kind: "code-block", readonly language: string | null, readonly text: string }

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

export interface CodeDefinition {
  readonly pathLabel: string
  readonly rangeLabel: string
  readonly description: ProseBlocks | null
  readonly lines: readonly CodeLine[]
  readonly note: string | null
  readonly forgeLink: ForgeLink | null
}

export type CodeDefinitions = Readonly<Record<string, CodeDefinition>>

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
