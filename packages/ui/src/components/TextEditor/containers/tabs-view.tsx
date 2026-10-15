import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { PlusIcon, XIcon } from "lucide-react"
import { useRef, useState, type KeyboardEvent } from "react"
import Button from "@/components/blocks/button"
import { TAB_CLASSES, TAB_LIST_CLASSES, tabIndexAfterKey } from "@/lib/tab-bar"
import {
  childrenOf,
  headingsOf,
  labelOf,
  newItemOf,
  TABS_KIND,
  withItemAppended,
  withItemMoved,
  withItemRelabelled,
  withItemRemoved,
} from "./container-changes"
import keepDragsFromEditor from "./editor-drag"
import ItemNameField from "./item-name-field"

export const TAB_BAR_ATTRIBUTE = "data-tab-bar"

export interface TabsViewState {
  readonly openIndex: number
  readonly namingIndex: number | null
}

const TAB_NAME_LABEL = "Tab name"
const ADD_TAB_LABEL = "Add a tab"
const REMOVE_TABS_LABEL = "Remove tabs"
const TAB_NAME_CLASSES = "-mb-px w-36 border-b-2 border-ring bg-transparent pb-2 text-sm font-bold text-foreground outline-none"
export const ICON_BUTTON_CLASSES = "flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
const STEP_BY_ARROW: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

const deleteLabelOf = (label: string): string => `Delete the tab ${label}`

export const viewStateOf = (tabs: ProseMirrorNode): TabsViewState => ({
  openIndex: typeof tabs.attrs.openIndex === "number" ? tabs.attrs.openIndex : 0,
  namingIndex: typeof tabs.attrs.namingIndex === "number" ? tabs.attrs.namingIndex : null,
})

const openIndexAfterDelete = (openIndex: number, deletedIndex: number, remainingCount: number): number => {
  if (openIndex > deletedIndex) return openIndex - 1
  return Math.min(openIndex, remainingCount - 1)
}

const TabsView = ({ node, getPos, editor }: NodeViewProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const tabButtonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const labels = childrenOf(node).map(labelOf)
  const { openIndex, namingIndex } = viewStateOf(node)

  const replaceBlock = (next: ProseMirrorNode | readonly ProseMirrorNode[] | null) => {
    const position = getPos()
    if (typeof position !== "number") return
    const range = { from: position, to: position + node.nodeSize }
    const transaction = next === null
      ? editor.state.tr.delete(range.from, range.to)
      : editor.state.tr.replaceWith(range.from, range.to, next)
    editor.view.dispatch(transaction)
  }

  const setViewState = (viewState: Partial<TabsViewState>) => {
    const position = getPos()
    if (typeof position !== "number") return
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, ...viewState }).setMeta("addToHistory", false))
  }

  const focusTabLater = (index: number) => {
    requestAnimationFrame(() => {
      tabButtonsRef.current[index]?.focus()
    })
  }

  const moveTab = (fromIndex: number, toIndex: number) => {
    replaceBlock(withItemMoved(node, fromIndex, toIndex, { openIndex: toIndex }))
    focusTabLater(toIndex)
  }

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault()
      setViewState({ namingIndex: index })
      return
    }
    if (event.altKey && Object.hasOwn(STEP_BY_ARROW, event.key)) {
      event.preventDefault()
      moveTab(index, index + STEP_BY_ARROW[event.key])
      return
    }
    const nextIndex = tabIndexAfterKey(event.key, index, labels.length)
    if (nextIndex === null) return
    event.preventDefault()
    setViewState({ openIndex: nextIndex })
    focusTabLater(nextIndex)
  }

  return (
    <NodeViewWrapper className="flex flex-col gap-4">
      <div ref={keepDragsFromEditor} {...{ [TAB_BAR_ATTRIBUTE]: "" }} contentEditable={false} className="flex items-end gap-3">
        <div role="tablist" className={TAB_LIST_CLASSES}>
          {labels.map((label, index) => (
            <div key={`${String(index)}-${label}`} role="presentation" className="flex items-end gap-1">
              {index === namingIndex
                ? (
                    <ItemNameField
                      fieldLabel={TAB_NAME_LABEL}
                      label={label}
                      className={TAB_NAME_CLASSES}
                      onCommit={(name) => { replaceBlock(withItemRelabelled(node, index, name, {}, { namingIndex: null })) }}
                      onCancel={() => { setViewState({ namingIndex: null }) }}
                    />
                  )
                : (
                    <button
                      ref={(button) => { tabButtonsRef.current[index] = button }}
                      type="button"
                      role="tab"
                      aria-selected={index === openIndex}
                      tabIndex={index === openIndex ? 0 : -1}
                      draggable
                      className={TAB_CLASSES}
                      onClick={() => { setViewState({ openIndex: index }) }}
                      onDoubleClick={() => { setViewState({ namingIndex: index }) }}
                      onKeyDown={(event) => { handleTabKey(event, index) }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", label)
                        setDragIndex(index)
                      }}
                      onDragOverCapture={(event) => { event.preventDefault() }}
                      onDropCapture={(event) => {
                        event.preventDefault()
                        if (dragIndex !== null) moveTab(dragIndex, index)
                        setDragIndex(null)
                      }}
                      onDragEndCapture={() => { setDragIndex(null) }}
                    >
                      {label}
                    </button>
                  )}
              <button
                type="button"
                aria-label={deleteLabelOf(label)}
                title={deleteLabelOf(label)}
                className={`${ICON_BUTTON_CLASSES} mb-1.5`}
                onClick={() => {
                  replaceBlock(withItemRemoved(node, index, { openIndex: openIndexAfterDelete(openIndex, index, labels.length - 1), namingIndex: null }))
                }}
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label={ADD_TAB_LABEL}
            title={ADD_TAB_LABEL}
            className={`${ICON_BUTTON_CLASSES} mb-1.5`}
            onClick={() => { replaceBlock(withItemAppended(node, newItemOf(node, TABS_KIND), { openIndex: labels.length, namingIndex: labels.length })) }}
          >
            <PlusIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        <Button type="button" variant="ghost" size="sm" className="mb-1" onClick={() => { replaceBlock(headingsOf(node)) }}>
          {REMOVE_TABS_LABEL}
        </Button>
      </div>
      <NodeViewContent className="flex flex-col gap-4" />
    </NodeViewWrapper>
  )
}

export default TabsView
