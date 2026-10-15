import { Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import AccordionView, { ACCORDION_CONTROLS_ATTRIBUTE } from "./accordion-view"
import { ACCORDION_KIND } from "./container-changes"
import containerMarkdownOf from "./container-markdown"
import { ACCORDION_MARKERS } from "./container-syntax"
import { isInside } from "./editor-drag"
import itemContent from "./item-content"
import SectionView, { SECTION_HEADER_ATTRIBUTE } from "./section-view"

const sectionNode = Node.create({
  name: ACCORDION_KIND.itemName,
  content: itemContent,
  defining: true,
  isolating: true,

  addAttributes: () => ({
    label: { default: ACCORDION_KIND.newItemLabel, rendered: false },
    isNaming: { default: false, rendered: false },
  }),

  parseHTML: () => [{ tag: "section[data-accordion-section]" }],

  renderHTML: () => ["section", { "data-accordion-section": "" }, 0],

  addNodeView: () => ReactNodeViewRenderer(SectionView, { stopEvent: ({ event }) => isInside(event.target, `[${SECTION_HEADER_ATTRIBUTE}]`) }),
})

const accordionNode = Node.create({
  name: ACCORDION_KIND.name,
  group: "block",
  content: `${ACCORDION_KIND.itemName}+`,
  defining: true,
  isolating: true,
  selectable: false,
  draggable: false,

  parseHTML: () => [{ tag: "div[data-accordion]" }],

  renderHTML: () => ["div", { "data-accordion": "" }, 0],

  addNodeView: () => ReactNodeViewRenderer(AccordionView, { stopEvent: ({ event }) => isInside(event.target, `[${ACCORDION_CONTROLS_ATTRIBUTE}]`) }),

  ...containerMarkdownOf(ACCORDION_KIND, ACCORDION_MARKERS),
})

const accordionExtensions = [accordionNode, sectionNode]

export default accordionExtensions
