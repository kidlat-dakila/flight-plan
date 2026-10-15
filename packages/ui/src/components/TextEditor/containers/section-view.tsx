import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { XIcon } from "lucide-react"
import type { DragEvent, KeyboardEvent } from "react"
import { withItemMoved, withItemRelabelled, withItemRemoved } from "./container-changes"
import keepDragsFromEditor from "./editor-drag"
import ItemNameField from "./item-name-field"
import { ICON_BUTTON_CLASSES } from "./tabs-view"

export const SECTION_HEADER_ATTRIBUTE = "data-section-header"

const SECTION_NAME_LABEL = "Section name"
const SECTION_DRAG_TYPE = "application/x-flight-plan-section"
const SECTION_NAME_CLASSES = "w-64 border-b-2 border-ring bg-transparent text-sm font-bold text-foreground outline-none"
const SECTION_NAME_BUTTON_CLASSES = "cursor-grab rounded-sm text-left text-sm font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const STEP_BY_ARROW: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1 }
const DECIMAL = 10

const deleteLabelOf = (label: string): string => `Delete the section ${label}`

interface SectionPlace {
  readonly accordion: ProseMirrorNode
  readonly accordionPosition: number
  readonly index: number
}

const placeOf = ({ editor, getPos }: Pick<NodeViewProps, "editor" | "getPos">): SectionPlace | null => {
  const position = getPos()
  if (typeof position !== "number") return null
  const resolved = editor.state.doc.resolve(position)
  return { accordion: resolved.parent, accordionPosition: resolved.before(), index: resolved.index() }
}

const focusSectionLater = (editor: NodeViewProps["editor"], accordionPosition: number, index: number) => {
  requestAnimationFrame(() => {
    const accordionElement = editor.view.nodeDOM(accordionPosition)
    if (!(accordionElement instanceof HTMLElement)) return
    Array.from(accordionElement.querySelectorAll<HTMLButtonElement>(`[${SECTION_HEADER_ATTRIBUTE}] button[data-section-name]`)).at(index)?.focus()
  })
}

const SectionView = ({ node, getPos, editor }: NodeViewProps) => {
  const label = typeof node.attrs.label === "string" ? node.attrs.label : ""
  const isNaming = node.attrs.isNaming === true

  const replaceAccordion = (change: (place: SectionPlace) => ProseMirrorNode | null) => {
    const place = placeOf({ editor, getPos })
    if (place === null) return
    const next = change(place)
    const range = { from: place.accordionPosition, to: place.accordionPosition + place.accordion.nodeSize }
    editor.view.dispatch(next === null ? editor.state.tr.delete(range.from, range.to) : editor.state.tr.replaceWith(range.from, range.to, next))
  }

  const setNaming = (isNamingNow: boolean) => {
    const position = getPos()
    if (typeof position !== "number") return
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, isNaming: isNamingNow }).setMeta("addToHistory", false))
  }

  const moveTo = (fromIndex: number, toIndex: number) => {
    const place = placeOf({ editor, getPos })
    if (place === null) return
    replaceAccordion(({ accordion }) => withItemMoved(accordion, fromIndex, toIndex))
    focusSectionLater(editor, place.accordionPosition, toIndex)
  }

  const handleNameKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const place = placeOf({ editor, getPos })
    if (place === null) return
    if (event.key === "Enter") {
      event.preventDefault()
      setNaming(true)
      return
    }
    if (event.altKey && Object.hasOwn(STEP_BY_ARROW, event.key)) {
      event.preventDefault()
      moveTo(place.index, place.index + STEP_BY_ARROW[event.key])
    }
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const place = placeOf({ editor, getPos })
    const fromIndex = Number.parseInt(event.dataTransfer.getData(SECTION_DRAG_TYPE), DECIMAL)
    if (place !== null && Number.isInteger(fromIndex)) moveTo(fromIndex, place.index)
  }

  return (
    <NodeViewWrapper className="flex flex-col gap-2 py-3">
      <div ref={keepDragsFromEditor} {...{ [SECTION_HEADER_ATTRIBUTE]: "" }} contentEditable={false} className="flex items-center gap-2">
        {isNaming
          ? (
              <ItemNameField
                fieldLabel={SECTION_NAME_LABEL}
                label={label}
                className={SECTION_NAME_CLASSES}
                onCommit={(name) => { replaceAccordion(({ accordion, index }) => withItemRelabelled(accordion, index, name, { isNaming: false })) }}
                onCancel={() => { setNaming(false) }}
              />
            )
          : (
              <button
                type="button"
                data-section-name=""
                draggable
                className={SECTION_NAME_BUTTON_CLASSES}
                onDoubleClick={() => { setNaming(true) }}
                onKeyDown={handleNameKey}
                onDragStart={(event) => {
                  event.dataTransfer.setData(SECTION_DRAG_TYPE, String(placeOf({ editor, getPos })?.index ?? ""))
                }}
                onDragOverCapture={(event) => { event.preventDefault() }}
                onDropCapture={handleDrop}
              >
                {label}
              </button>
            )}
        <button
          type="button"
          aria-label={deleteLabelOf(label)}
          title={deleteLabelOf(label)}
          className={ICON_BUTTON_CLASSES}
          onClick={() => { replaceAccordion(({ accordion, index }) => withItemRemoved(accordion, index)) }}
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      <NodeViewContent className="flex flex-col gap-4" />
    </NodeViewWrapper>
  )
}

export default SectionView
