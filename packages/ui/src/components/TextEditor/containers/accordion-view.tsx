import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { PlusIcon } from "lucide-react"
import Button from "@/components/blocks/button"
import { ACCORDION_KIND, headingsOf, newItemOf, withItemAppended } from "./container-changes"

export const ACCORDION_CONTROLS_ATTRIBUTE = "data-accordion-controls"

const ADD_SECTION_LABEL = "Add a section"
const REMOVE_ACCORDION_LABEL = "Remove accordion"

const AccordionView = ({ node, getPos, editor }: NodeViewProps) => {
  const replaceBlock = (next: ProseMirrorNode | readonly ProseMirrorNode[]) => {
    const position = getPos()
    if (typeof position !== "number") return
    editor.view.dispatch(editor.state.tr.replaceWith(position, position + node.nodeSize, next))
  }

  return (
    <NodeViewWrapper className="flex flex-col border-y border-border">
      <NodeViewContent className="flex flex-col divide-y divide-border" />
      <div {...{ [ACCORDION_CONTROLS_ATTRIBUTE]: "" }} contentEditable={false} className="flex items-center gap-2 border-t border-border py-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => { replaceBlock(withItemAppended(node, newItemOf(node, ACCORDION_KIND, { isNaming: true }))) }}>
          <PlusIcon aria-hidden="true" />
          {ADD_SECTION_LABEL}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { replaceBlock(headingsOf(node)) }}>
          {REMOVE_ACCORDION_LABEL}
        </Button>
      </div>
    </NodeViewWrapper>
  )
}

export default AccordionView
