import MarkdownIt from "markdown-it"
import type { Inline, Prose, ProseBlock, ProseListItem, ProseSection, ProseTab } from "@flightplan/configurations"
import { ACCORDION_CONTAINER, containerPluginOf, TABS_CONTAINER } from "./container-rule"

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number]

const CODE_LINK_SCHEME = "code:"
const SOFT_BREAK_TEXT = " "
const CLOSING = -1
const TRAILING_LINE_BREAK_PATTERN = /\n$/

const MARKDOWN_OPTIONS = { html: false, linkify: false } as const

const isCodeLink = (href: string): boolean => href.startsWith(CODE_LINK_SCHEME)

const linkEncoding = new MarkdownIt(MARKDOWN_OPTIONS)

const normalizeLinkKeepingCodeLinks = (url: string): string => (isCodeLink(url) ? url : linkEncoding.normalizeLink(url))

const createMarkdown = (): MarkdownIt => Object.assign(new MarkdownIt(MARKDOWN_OPTIONS), { normalizeLink: normalizeLinkKeepingCodeLinks })

const markdown = createMarkdown()
const contextMarkdown = createMarkdown()
  .use(containerPluginOf(TABS_CONTAINER))
  .use(containerPluginOf(ACCORDION_CONTAINER))

interface OpenLink {
  readonly href: string
  readonly linkId: string | null
  readonly text: string
  readonly isCode: boolean
}

interface InlineState {
  readonly inlines: readonly Inline[]
  readonly isStrong: boolean
  readonly isEmphasized: boolean
  readonly link: OpenLink | null
}

const EMPTY_INLINE_STATE: InlineState = { inlines: [], isStrong: false, isEmphasized: false, link: null }

const openLinkOf = (token: MarkdownToken, knownLinkIds: ReadonlySet<string>): OpenLink => {
  const href = token.attrGet("href") ?? ""
  const linkId = isCodeLink(href) ? href.slice(CODE_LINK_SCHEME.length) : null
  return { href, linkId: linkId !== null && knownLinkIds.has(linkId) ? linkId : null, text: "", isCode: false }
}

const withInline = (state: InlineState, inline: Inline): InlineState => ({
  ...state,
  inlines: [...state.inlines, inline],
})

const withLinkText = (state: InlineState, link: OpenLink, text: string, isCode: boolean): InlineState => ({
  ...state,
  link: { ...link, text: `${link.text}${text}`, isCode: link.isCode || isCode },
})

const textKindOf = (state: InlineState): "strong" | "emphasis" | "text" => {
  if (state.isStrong) return "strong"
  return state.isEmphasized ? "emphasis" : "text"
}

const withText = (state: InlineState, text: string): InlineState => {
  if (state.link !== null) return withLinkText(state, state.link, text, false)
  if (text === "") return state
  return withInline(state, { kind: textKindOf(state), text })
}

const withCode = (state: InlineState, text: string): InlineState =>
  state.link === null ? withInline(state, { kind: "code", text }) : withLinkText(state, state.link, text, true)

const toLinkInline = (link: OpenLink): Inline =>
  isCodeLink(link.href)
    ? { kind: "code-link", text: link.text, isCode: link.isCode, linkId: link.linkId }
    : { kind: "link", text: link.text, href: link.href }

const withLinkClosed = (state: InlineState): InlineState =>
  state.link === null ? state : { ...state, link: null, inlines: [...state.inlines, toLinkInline(state.link)] }

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
      case "em_open":
        return { ...state, isEmphasized: true }
      case "em_close":
        return { ...state, isEmphasized: false }
      case "link_open":
        return { ...state, link: openLinkOf(token, knownLinkIds) }
      case "link_close":
        return withLinkClosed(state)
      default:
        return state
    }
  }

const toInlines = (token: MarkdownToken, knownLinkIds: ReadonlySet<string>): Inline[] => [
  ...(token.children ?? []).reduce(withInlineToken(knownLinkIds), EMPTY_INLINE_STATE).inlines,
]

interface TokenGroup {
  readonly head: MarkdownToken
  readonly inner: readonly MarkdownToken[]
}

interface GroupingState {
  readonly groups: readonly TokenGroup[]
  readonly depth: number
}

const NOTHING_GROUPED: GroupingState = { groups: [], depth: 0 }

const withInnerToken = (groups: readonly TokenGroup[], token: MarkdownToken): TokenGroup[] =>
  groups.map((group, index) => (index === groups.length - 1 ? { ...group, inner: [...group.inner, token] } : group))

const withGroupedToken = ({ groups, depth }: GroupingState, token: MarkdownToken): GroupingState => {
  const nextDepth = depth + token.nesting
  if (depth === 0) return { groups: [...groups, { head: token, inner: [] }], depth: nextDepth }
  if (token.nesting === CLOSING && nextDepth === 0) return { groups, depth: nextDepth }
  return { groups: withInnerToken(groups, token), depth: nextDepth }
}

const groupSiblings = (tokens: readonly MarkdownToken[]): readonly TokenGroup[] =>
  tokens.reduce(withGroupedToken, NOTHING_GROUPED).groups

const inlinesIn = (tokens: readonly MarkdownToken[], knownLinkIds: ReadonlySet<string>): Inline[] =>
  tokens.filter((token) => token.type === "inline").flatMap((token) => toInlines(token, knownLinkIds))

const toListItem = (blocks: Prose): ProseListItem => {
  const first = blocks.find((_block, index) => index === 0)
  return first?.kind === "paragraph" ? { inlines: first.inlines, blocks: blocks.slice(1) } : { inlines: [], blocks }
}

const toBlocks = (tokens: readonly MarkdownToken[], knownLinkIds: ReadonlySet<string>): Prose =>
  groupSiblings(tokens).flatMap((group) => toBlock(group, knownLinkIds))

const toList = (group: TokenGroup, isOrdered: boolean, knownLinkIds: ReadonlySet<string>): ProseBlock => ({
  kind: "list",
  isOrdered,
  items: groupSiblings(group.inner).map((item) => toListItem(toBlocks(item.inner, knownLinkIds))),
})

const toLabelledBlocks = (group: TokenGroup, knownLinkIds: ReadonlySet<string>): ProseTab & ProseSection => ({
  label: group.head.info,
  blocks: toBlocks(group.inner, knownLinkIds),
})

const toTabs = (group: TokenGroup, knownLinkIds: ReadonlySet<string>): ProseBlock => ({
  kind: "tabs",
  tabs: groupSiblings(group.inner).map((tab) => toLabelledBlocks(tab, knownLinkIds)),
})

const toAccordion = (group: TokenGroup, knownLinkIds: ReadonlySet<string>): ProseBlock => ({
  kind: "accordion",
  sections: groupSiblings(group.inner).map((section) => toLabelledBlocks(section, knownLinkIds)),
})

const toCodeBlock = (token: MarkdownToken): ProseBlock => ({
  kind: "code-block",
  language: token.info.trim() === "" ? null : token.info.trim(),
  text: token.content.replace(TRAILING_LINE_BREAK_PATTERN, ""),
})

function toBlock(group: TokenGroup, knownLinkIds: ReadonlySet<string>): ProseBlock[] {
  switch (group.head.type) {
    case "paragraph_open":
      return [{ kind: "paragraph", inlines: inlinesIn(group.inner, knownLinkIds) }]
    case "heading_open":
      return [{ kind: "heading", inlines: inlinesIn(group.inner, knownLinkIds) }]
    case "bullet_list_open":
      return [toList(group, false, knownLinkIds)]
    case "ordered_list_open":
      return [toList(group, true, knownLinkIds)]
    case "tabs_open":
      return [toTabs(group, knownLinkIds)]
    case "accordion_open":
      return [toAccordion(group, knownLinkIds)]
    case "blockquote_open":
      return [{ kind: "quote", blocks: toBlocks(group.inner, knownLinkIds) }]
    case "fence":
    case "code_block":
      return [toCodeBlock(group.head)]
    default:
      return []
  }
}

export const parseProse = (text: string, knownLinkIds: ReadonlySet<string>): Prose =>
  toBlocks(markdown.parse(text, {}), knownLinkIds)

export const parseContextProse = (text: string, knownLinkIds: ReadonlySet<string>): Prose =>
  toBlocks(contextMarkdown.parse(text, {}), knownLinkIds)

export const parseInlines = (text: string, knownLinkIds: ReadonlySet<string>): Inline[] =>
  markdown.parseInline(text, {}).flatMap((token) => toInlines(token, knownLinkIds))
