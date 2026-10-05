import MarkdownIt from "markdown-it"
import type { Inline, Prose } from "@flightplan/configurations"

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number]

const CODE_LINK_SCHEME = "code:"
const SOFT_BREAK_TEXT = " "

const markdown = new MarkdownIt({ html: false, linkify: false })

interface OpenLink {
  readonly linkId: string | null
  readonly text: string
  readonly isCode: boolean
}

interface InlineState {
  readonly inlines: readonly Inline[]
  readonly isStrong: boolean
  readonly link: OpenLink | null
}

const EMPTY_INLINE_STATE: InlineState = { inlines: [], isStrong: false, link: null }

const linkIdOf = (token: MarkdownToken, knownLinkIds: ReadonlySet<string>): string | null => {
  const href = token.attrGet("href") ?? ""
  const linkId = href.startsWith(CODE_LINK_SCHEME) ? href.slice(CODE_LINK_SCHEME.length) : null
  return linkId !== null && knownLinkIds.has(linkId) ? linkId : null
}

const withInline = (state: InlineState, inline: Inline): InlineState => ({
  ...state,
  inlines: [...state.inlines, inline],
})

const withLinkText = (state: InlineState, link: OpenLink, text: string, isCode: boolean): InlineState => ({
  ...state,
  link: { ...link, text: `${link.text}${text}`, isCode: link.isCode || isCode },
})

const withText = (state: InlineState, text: string): InlineState => {
  if (state.link !== null) return withLinkText(state, state.link, text, false)
  if (text === "") return state
  return withInline(state, { kind: state.isStrong ? "strong" : "text", text })
}

const withCode = (state: InlineState, text: string): InlineState =>
  state.link === null ? withInline(state, { kind: "code", text }) : withLinkText(state, state.link, text, true)

const withLinkClosed = (state: InlineState): InlineState =>
  state.link === null
    ? state
    : {
        ...state,
        link: null,
        inlines: [
          ...state.inlines,
          { kind: "code-link", text: state.link.text, isCode: state.link.isCode, linkId: state.link.linkId },
        ],
      }

const withInlineToken = (knownLinkIds: ReadonlySet<string>) =>
  (state: InlineState, token: MarkdownToken): InlineState => {
    switch (token.type) {
      case "text":
        return withText(state, token.content)
      case "softbreak":
      case "hardbreak":
        return withText(state, SOFT_BREAK_TEXT)
      case "code_inline":
        return withCode(state, token.content)
      case "strong_open":
        return { ...state, isStrong: true }
      case "strong_close":
        return { ...state, isStrong: false }
      case "link_open":
        return { ...state, link: { linkId: linkIdOf(token, knownLinkIds), text: "", isCode: false } }
      case "link_close":
        return withLinkClosed(state)
      default:
        return state
    }
  }

const toInlines = (token: MarkdownToken, knownLinkIds: ReadonlySet<string>): Inline[] => [
  ...(token.children ?? []).reduce(withInlineToken(knownLinkIds), EMPTY_INLINE_STATE).inlines,
]

interface OpenList {
  readonly isOrdered: boolean
  readonly items: readonly Inline[][]
}

interface BlockState {
  readonly blocks: Prose
  readonly list: OpenList | null
}

const EMPTY_BLOCK_STATE: BlockState = { blocks: [], list: null }

const withInlineBlock = (state: BlockState, inlines: Inline[]): BlockState =>
  state.list === null
    ? { ...state, blocks: [...state.blocks, { kind: "paragraph", inlines }] }
    : { ...state, list: { ...state.list, items: [...state.list.items, inlines] } }

const withListClosed = (state: BlockState): BlockState =>
  state.list === null
    ? state
    : {
        list: null,
        blocks: [...state.blocks, { kind: "list", isOrdered: state.list.isOrdered, items: [...state.list.items] }],
      }

const withBlockToken = (knownLinkIds: ReadonlySet<string>) =>
  (state: BlockState, token: MarkdownToken): BlockState => {
    switch (token.type) {
      case "bullet_list_open":
        return { ...state, list: { isOrdered: false, items: [] } }
      case "ordered_list_open":
        return { ...state, list: { isOrdered: true, items: [] } }
      case "bullet_list_close":
      case "ordered_list_close":
        return withListClosed(state)
      case "inline":
        return withInlineBlock(state, toInlines(token, knownLinkIds))
      default:
        return state
    }
  }

export const parseProse = (text: string, knownLinkIds: ReadonlySet<string>): Prose =>
  markdown.parse(text, {}).reduce(withBlockToken(knownLinkIds), EMPTY_BLOCK_STATE).blocks

export const parseInlines = (text: string, knownLinkIds: ReadonlySet<string>): Inline[] =>
  markdown.parseInline(text, {}).flatMap((token) => toInlines(token, knownLinkIds))
