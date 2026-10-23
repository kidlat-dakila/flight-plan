import { useState } from "react"
import { nextSidePanel, usePanelShortcuts, type ReviewPanel, type SidePanel } from "@flightplan/ui/lib/review-panels"

interface ChatOpening {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export interface ReviewPanelsState {
  readonly isExplorerShown: boolean
  readonly sidePanel: SidePanel | null
  readonly onToggle: (panel: ReviewPanel) => void
  readonly onHideSidePanel: () => void
}

export const sidePanelOf = (isChatOpen: boolean, isSectionsShown: boolean): SidePanel | null => {
  if (isChatOpen) return "chat"
  return isSectionsShown ? "sections" : null
}

export const useReviewPanels = (chat: ChatOpening): ReviewPanelsState => {
  const [isExplorerShown, setIsExplorerShown] = useState(true)
  const [isSectionsShown, setIsSectionsShown] = useState(true)
  const sidePanel = sidePanelOf(chat.isOpen, isSectionsShown)

  const showSidePanel = (panel: SidePanel | null): void => {
    if (panel === "chat") chat.onOpen()
    else chat.onClose()
    setIsSectionsShown(panel === "sections")
  }

  const toggle = (panel: ReviewPanel): void => {
    if (panel === "explorer") setIsExplorerShown((isShown) => !isShown)
    else showSidePanel(nextSidePanel(sidePanel, panel))
  }

  usePanelShortcuts(toggle)

  return {
    isExplorerShown,
    sidePanel,
    onToggle: toggle,
    onHideSidePanel: () => { showSidePanel(null) },
  }
}
