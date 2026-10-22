import { Node } from "@tiptap/core"
import type { LineRange } from "@/lib/line-selection"

export interface CodeLinkAttributes {
  readonly linkId: string
  readonly label: string
  readonly isCode: boolean
}

export const CODE_LINK_NODE_NAME = "codeLink"
const LINK_ID_ATTRIBUTE = "data-code-link"
const CODE_ATTRIBUTE = "data-code"
const CODE_LINK_PATTERN = /^\[(`?)([^\]`\n]+)\1\]\(code:((?:[^()\s]|\([^()\s]*\))+)\)/
const CODE_LINK_START_PATTERN = /\[[^\]\n]*\]\(code:/
const CODE_LINK_CLASSES = "rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[0.875em] data-code:font-mono"

const LINKABLE_LABEL_PATTERN = /^[^\]`\n]+$/
const LINKABLE_PATH_PATTERN = /^[^)\s]+$/
const TARGET_SEPARATOR = "#"

export interface LinesCodeLink {
  readonly path: string
  readonly range: LineRange
  readonly label: string
  readonly isCode: boolean
}

const linesTargetOf = ({ lineStart, lineEnd }: LineRange): string =>
  lineStart === lineEnd ? `L${String(lineStart)}` : `L${String(lineStart)}-${String(lineEnd)}`

export const buildLinesCodeLink = ({ path, range, label, isCode }: LinesCodeLink): CodeLinkAttributes | null => {
  const trimmedLabel = label.trim()
  return LINKABLE_LABEL_PATTERN.test(trimmedLabel) && LINKABLE_PATH_PATTERN.test(path)
    ? { linkId: `${path}${TARGET_SEPARATOR}${linesTargetOf(range)}`, label: trimmedLabel, isCode }
    : null
}

const textOf = (value: unknown): string => (typeof value === "string" ? value : "")

const attributesOf = (attributes: Readonly<Record<string, unknown>> | undefined): CodeLinkAttributes => ({
  linkId: textOf(attributes?.linkId),
  label: textOf(attributes?.label),
  isCode: attributes?.isCode === true,
})

export const formatCodeLink = ({ linkId, label, isCode }: CodeLinkAttributes): string =>
  `[${isCode ? `\`${label}\`` : label}](code:${linkId})`

export const parseCodeLink = (source: string): (CodeLinkAttributes & { readonly raw: string }) | null => {
  const match = CODE_LINK_PATTERN.exec(source)
  return match === null
    ? null
    : { raw: match[0], isCode: match[1] !== "", label: match[2], linkId: match[3] }
}

const codeLinkNode = Node.create({
  name: CODE_LINK_NODE_NAME,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: () => ({
    linkId: { default: "" },
    label: { default: "" },
    isCode: { default: false },
  }),

  parseHTML: () => [
    {
      tag: `span[${LINK_ID_ATTRIBUTE}]`,
      getAttrs: (element) => ({
        linkId: element.getAttribute(LINK_ID_ATTRIBUTE) ?? "",
        label: element.textContent,
        isCode: element.hasAttribute(CODE_ATTRIBUTE),
      }),
    },
  ],

  renderHTML: ({ node }) => {
    const { linkId, label, isCode } = attributesOf(node.attrs)
    return [
      "span",
      { [LINK_ID_ATTRIBUTE]: linkId, ...(isCode ? { [CODE_ATTRIBUTE]: "" } : {}), class: CODE_LINK_CLASSES, title: linkId },
      label,
    ]
  },

  markdownTokenizer: {
    name: CODE_LINK_NODE_NAME,
    level: "inline",
    start: (source) => source.search(CODE_LINK_START_PATTERN),
    tokenize: (source) => {
      const codeLink = parseCodeLink(source)
      return codeLink === null ? undefined : { type: CODE_LINK_NODE_NAME, ...codeLink }
    },
  },

  parseMarkdown: (token) => ({ type: CODE_LINK_NODE_NAME, attrs: attributesOf(token) }),

  renderMarkdown: (node) => formatCodeLink(attributesOf(node.attrs)),
})

export default codeLinkNode
