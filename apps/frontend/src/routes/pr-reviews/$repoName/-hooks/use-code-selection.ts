import { useEffect, useState } from "react"
import type { CodeSelection } from "@/routes/pr-reviews/$repoName/-components/SelectionReference"

const LINE_SELECTOR = "[data-line]"
const CODE_SELECTOR = "[data-path]"
const POPUP_GAP_PX = 6
const DECIMAL = 10

const lineElementOf = (node: Node | null): HTMLElement | null => {
  const element = node instanceof Element ? node : node?.parentElement ?? null
  return element?.closest<HTMLElement>(LINE_SELECTOR) ?? null
}

const lineNumberOf = (element: HTMLElement): number => Number.parseInt(element.dataset.line ?? "", DECIMAL)

const readCodeSelection = (): CodeSelection | null => {
  const selection = window.getSelection()
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return null
  const startLine = lineElementOf(selection.anchorNode)
  const endLine = lineElementOf(selection.focusNode)
  const code = startLine?.closest<HTMLElement>(CODE_SELECTOR) ?? null
  const path = code?.dataset.path
  if (startLine === null || endLine === null || code === null || path === undefined || !code.contains(endLine)) return null
  const lineStart = lineNumberOf(startLine)
  const lineEnd = lineNumberOf(endLine)
  if (Number.isNaN(lineStart) || Number.isNaN(lineEnd)) return null
  const rectangle = selection.getRangeAt(0).getBoundingClientRect()
  return { path, lineStart, lineEnd, left: rectangle.left, top: rectangle.top - POPUP_GAP_PX }
}

export const useCodeSelection = (): CodeSelection | null => {
  const [codeSelection, setCodeSelection] = useState<CodeSelection | null>(null)

  useEffect(() => {
    const handleSelectionEnd = (): void => {
      setCodeSelection(readCodeSelection())
    }
    const handleScroll = (): void => {
      setCodeSelection(null)
    }
    document.addEventListener("mouseup", handleSelectionEnd)
    document.addEventListener("keyup", handleSelectionEnd)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd)
      document.removeEventListener("keyup", handleSelectionEnd)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return codeSelection
}
