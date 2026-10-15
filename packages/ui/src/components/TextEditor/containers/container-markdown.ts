import type { JSONContent, MarkdownParseHelpers, MarkdownRendererHelpers, MarkdownToken, MarkdownTokenizer } from "@tiptap/core"
import type { ContainerKind } from "./container-changes"
import { formatContainer, parseContainerSource, type ContainerMarkers } from "./container-syntax"

const BLOCK_SEPARATOR = "\n\n"

interface ItemToken {
  readonly label: string
  readonly tokens: MarkdownToken[]
}

const textOf = (value: unknown): string => (typeof value === "string" ? value : "")

const isItemToken = (value: unknown): value is ItemToken =>
  typeof value === "object"
  && value !== null
  && "label" in value
  && typeof value.label === "string"
  && "tokens" in value
  && Array.isArray(value.tokens)

const itemTokensOf = (token: MarkdownToken): ItemToken[] => {
  const items: unknown = token.items
  return Array.isArray(items) ? items.filter(isItemToken) : []
}

const withAtLeastOneBlock = (content: JSONContent[]): JSONContent[] => (content.length === 0 ? [{ type: "paragraph" }] : content)

const containerMarkdownOf = (kind: ContainerKind, markers: ContainerMarkers) => {
  const markdownTokenizer: MarkdownTokenizer = {
    name: kind.name,
    level: "block",
    start: (source) => source.search(markers.startPattern),
    tokenize: (source, _tokens, lexer) => {
      const parsed = parseContainerSource(source, markers)
      return parsed === null
        ? undefined
        : { type: kind.name, raw: parsed.raw, items: parsed.items.map((item) => ({ label: item.label, tokens: lexer.blockTokens(item.body) })) }
    },
  }
  const parseMarkdown = (token: MarkdownToken, helpers: MarkdownParseHelpers): JSONContent => ({
    type: kind.name,
    content: itemTokensOf(token).map((item) => ({
      type: kind.itemName,
      attrs: { label: item.label },
      content: withAtLeastOneBlock(helpers.parseChildren(item.tokens)),
    })),
  })
  const renderMarkdown = (node: JSONContent, helpers: MarkdownRendererHelpers): string =>
    formatContainer(
      (node.content ?? []).map((item) => ({
        label: textOf(item.attrs?.label),
        body: helpers.renderChildren(item.content ?? [], BLOCK_SEPARATOR).trim(),
      })),
      markers,
    )
  return { markdownTokenizer, parseMarkdown, renderMarkdown }
}

export default containerMarkdownOf
