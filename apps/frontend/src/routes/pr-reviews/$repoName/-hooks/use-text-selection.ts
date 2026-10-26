import { useEffect, useState } from "react"
import type { CodeSelection, PartSelection, TextSelection } from "@/routes/pr-reviews/$repoName/-components/SelectionReference"
import type { Excerpt } from "@flightplan/ui/ChatPanel"
import type { LineAddress } from "@flightplan/ui/CodeBlock"
import type { CommentRange } from "@flightplan/ui/FileRows"
import { artifactPartOf } from "@flightplan/ui/lib/artifact-part"

interface ToolbarPlace {
  readonly left: number
  readonly top: number
}

interface SelectedLines {
  readonly code: HTMLElement
  readonly path: string
  readonly startLine: HTMLElement
  readonly endLine: HTMLElement
}

const LINE_SELECTOR = "[data-line]"
const CODE_SELECTOR = "[data-path]"
const CODE_CELL_SELECTOR = ":scope > [data-marked]"
const REVIEW_CONTENT_SELECTOR = "[data-review-content], [data-segment-id]"
const EDITABLE_SELECTOR = "input, textarea, [contenteditable]:not([contenteditable='false'])"
const LINE_BREAK = "\n"
const TRAILING_LINE_BREAK = /\n$/
const POPUP_GAP_PX = 6
const MAX_EXCERPT_LENGTH = 10_000
const DECIMAL = 10

export const reviewContentMark = { "data-review-content": "" } as const

const elementOf = (node: Node | null): Element | null => (node instanceof Element ? node : node?.parentElement ?? null)

const lineElementOf = (node: Node | null): HTMLElement | null => elementOf(node)?.closest<HTMLElement>(LINE_SELECTOR) ?? null

const codeElementOf = (element: Element): HTMLElement | null => element.closest<HTMLElement>(CODE_SELECTOR)

const lineNumberOf = (element: HTMLElement): number => Number.parseInt(element.dataset.line ?? "", DECIMAL)

const isEditable = (element: Element | null): boolean => element?.closest(EDITABLE_SELECTOR) != null

const commentAddressOf = (element: HTMLElement): LineAddress | null => {
  const { commentSide, commentLine } = element.dataset
  return (commentSide === "old" || commentSide === "new") && commentLine !== undefined ? { side: commentSide, lineLabel: commentLine } : null
}

export const commentRangeBetween = (anchor: LineAddress | null, focus: LineAddress | null): CommentRange | null => {
  if (focus === null) return null
  const reached = Number.parseInt(focus.lineLabel, DECIMAL)
  const started = anchor?.side === focus.side ? Number.parseInt(anchor.lineLabel, DECIMAL) : reached
  return { side: focus.side, startLineLabel: String(Math.min(started, reached)), lineLabel: String(Math.max(started, reached)) }
}

const excerptOf = (kind: Excerpt["kind"], text: string): Excerpt => ({ kind, text: text.slice(0, MAX_EXCERPT_LENGTH) })

const toolbarPlaceOf = (range: Range): ToolbarPlace => {
  const rectangle = range.getBoundingClientRect()
  return { left: rectangle.left, top: rectangle.top - POPUP_GAP_PX }
}

const selectedTextWithin = (cell: Element, selected: Range): string => {
  const cellRange = document.createRange()
  cellRange.selectNodeContents(cell)
  if (cellRange.compareBoundaryPoints(Range.START_TO_START, selected) < 0) cellRange.setStart(selected.startContainer, selected.startOffset)
  if (cellRange.compareBoundaryPoints(Range.END_TO_END, selected) > 0) cellRange.setEnd(selected.endContainer, selected.endOffset)
  return cellRange.toString()
}

const selectedCodeOf = (code: HTMLElement, selected: Range): string =>
  [...code.querySelectorAll<HTMLElement>(LINE_SELECTOR)]
    .filter((line) => codeElementOf(line) === code && selected.intersectsNode(line))
    .map((line) => line.querySelector(CODE_CELL_SELECTOR))
    .filter((cell) => cell !== null)
    .map((cell) => selectedTextWithin(cell, selected).replace(TRAILING_LINE_BREAK, ""))
    .join(LINE_BREAK)

const selectedLinesOf = (selection: Selection): SelectedLines | null => {
  const startLine = lineElementOf(selection.anchorNode)
  const endLine = lineElementOf(selection.focusNode)
  const code = startLine === null ? null : codeElementOf(startLine)
  const path = code?.dataset.path
  if (startLine === null || endLine === null || code === null || path === undefined || !code.contains(endLine)) return null
  return { code, path, startLine, endLine }
}

const codeSelectionOf = ({ code, path, startLine, endLine }: SelectedLines, range: Range): CodeSelection | null => {
  const lineStart = lineNumberOf(startLine)
  const lineEnd = lineNumberOf(endLine)
  if (Number.isNaN(lineStart) || Number.isNaN(lineEnd)) return null
  return {
    kind: "code",
    path,
    lineStart,
    lineEnd,
    commentRange: commentRangeBetween(commentAddressOf(startLine), commentAddressOf(endLine)),
    excerpt: excerptOf("code", selectedCodeOf(code, range)),
    ...toolbarPlaceOf(range),
  }
}

const partSelectionOf = (selection: Selection, range: Range): PartSelection | null => {
  const ancestor = elementOf(range.commonAncestorContainer)
  const text = selection.toString().trim()
  const touchedElements = [elementOf(selection.anchorNode), elementOf(selection.focusNode), document.activeElement]
  if (ancestor?.closest(REVIEW_CONTENT_SELECTOR) == null || text === "" || touchedElements.some(isEditable)) return null
  return { kind: "text", part: artifactPartOf(ancestor), excerpt: excerptOf("text", text), ...toolbarPlaceOf(range) }
}

const readTextSelection = (): TextSelection | null => {
  const selection = window.getSelection()
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const lines = selectedLinesOf(selection)
  return lines === null ? partSelectionOf(selection, range) : codeSelectionOf(lines, range)
}

export const useTextSelection = (): TextSelection | null => {
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null)

  useEffect(() => {
    const handleSelectionEnd = (): void => {
      setTextSelection(readTextSelection())
    }
    const handleScroll = (): void => {
      setTextSelection(null)
    }
    const handleSelectionChange = (): void => {
      if (readTextSelection() === null) setTextSelection(null)
    }
    document.addEventListener("selectionchange", handleSelectionChange)
    document.addEventListener("mouseup", handleSelectionEnd)
    document.addEventListener("keyup", handleSelectionEnd)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      document.removeEventListener("mouseup", handleSelectionEnd)
      document.removeEventListener("keyup", handleSelectionEnd)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return textSelection
}
