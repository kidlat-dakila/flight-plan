import { findChildren, Node } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { childrenOf, TABS_KIND } from "./container-changes"
import containerMarkdownOf from "./container-markdown"
import { TABS_MARKERS } from "./container-syntax"
import { isInside } from "./editor-drag"
import itemContent from "./item-content"
import TabsView, { TAB_BAR_ATTRIBUTE, viewStateOf } from "./tabs-view"

const HIDDEN_TAB_ATTRIBUTES = { hidden: "hidden" }

interface TabRange {
  readonly from: number
  readonly to: number
}

const tabRangesOf = (tabs: ProseMirrorNode, position: number): TabRange[] =>
  childrenOf(tabs).reduce<TabRange[]>((ranges, tab) => {
    const from = ranges.at(-1)?.to ?? position + 1
    return [...ranges, { from, to: from + tab.nodeSize }]
  }, [])

const hiddenTabsOf = (doc: ProseMirrorNode): DecorationSet =>
  DecorationSet.create(
    doc,
    findChildren(doc, (node) => node.type.name === TABS_KIND.name).flatMap(({ node, pos }) =>
      tabRangesOf(node, pos)
        .filter((_, index) => index !== viewStateOf(node).openIndex)
        .map(({ from, to }) => Decoration.node(from, to, HIDDEN_TAB_ATTRIBUTES)),
    ),
  )

const openTabAtSelection = (state: EditorState): Transaction | null => {
  const { $from } = state.selection
  const tabDepth = Array.from({ length: $from.depth }, (_, offset) => $from.depth - offset).find(
    (depth) => $from.node(depth).type.name === TABS_KIND.itemName,
  )
  if (tabDepth === undefined) return null
  const tabsDepth = tabDepth - 1
  const tabIndex = $from.index(tabsDepth)
  const tabs = $from.node(tabsDepth)
  if (viewStateOf(tabs).openIndex === tabIndex) return null
  return state.tr
    .setNodeMarkup($from.before(tabsDepth), undefined, { ...tabs.attrs, openIndex: tabIndex })
    .setMeta("addToHistory", false)
}

const tabsPlugin = new Plugin({
  key: new PluginKey(TABS_KIND.name),
  props: { decorations: (state) => hiddenTabsOf(state.doc) },
  appendTransaction: (transactions, _oldState, state) =>
    transactions.some((transaction) => transaction.selectionSet) ? openTabAtSelection(state) : null,
})

const tabNode = Node.create({
  name: TABS_KIND.itemName,
  content: itemContent,
  defining: true,
  isolating: true,

  addAttributes: () => ({
    label: { default: TABS_KIND.newItemLabel, rendered: false },
  }),

  parseHTML: () => [{ tag: "section[data-tab]" }],

  renderHTML: () => ["section", { "data-tab": "", "class": "flex flex-col gap-4" }, 0],
})

const tabsNode = Node.create({
  name: TABS_KIND.name,
  group: "block",
  content: `${TABS_KIND.itemName}+`,
  defining: true,
  isolating: true,
  selectable: false,
  draggable: false,

  addAttributes: () => ({
    openIndex: { default: 0, rendered: false },
    namingIndex: { default: null, rendered: false },
  }),

  parseHTML: () => [{ tag: "div[data-tabs]" }],

  renderHTML: () => ["div", { "data-tabs": "" }, 0],

  addNodeView: () => ReactNodeViewRenderer(TabsView, { stopEvent: ({ event }) => isInside(event.target, `[${TAB_BAR_ATTRIBUTE}]`) }),

  addProseMirrorPlugins: () => [tabsPlugin],

  ...containerMarkdownOf(TABS_KIND, TABS_MARKERS),
})

const tabsExtensions = [tabsNode, tabNode]

export default tabsExtensions
