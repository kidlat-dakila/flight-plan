import { createContext, useState } from "react"
import { useNavigatorSection } from "@/lib/navigator"
import { navigatorButtonOf, type NavigatorGroup } from "@/lib/navigator-controls"
import type { ProseBlock, ProseBlocks } from "@/lib/review-content"

export interface AccordionOpening {
  readonly openLabels: ReadonlySet<string>
  readonly onToggle: (label: string) => void
}

export const AccordionOpeningContext = createContext<AccordionOpening | null>(null)

const EXPAND_ALL_LABEL = "Expand all"
const COLLAPSE_ALL_LABEL = "Collapse all"
const EXPAND_ALL_KEY = "q"
const NOTHING_OPEN: ReadonlySet<string> = new Set()

const accordionLabelsOfBlock = (block: ProseBlock): string[] => {
  if (block.kind === "accordion") return block.sections.map((section) => section.label)
  if (block.kind === "quote") return block.blocks.flatMap(accordionLabelsOfBlock)
  return []
}

export const accordionLabelsOf = (blocks: ProseBlocks): string[] => blocks.flatMap(accordionLabelsOfBlock)

const toggled = (labels: ReadonlySet<string>, label: string): ReadonlySet<string> =>
  new Set(labels.has(label) ? [...labels].filter((openLabel) => openLabel !== label) : [...labels, label])

export const useAccordionNavigation = (anchorId: string, blocks: ProseBlocks): AccordionOpening => {
  const [openLabels, setOpenLabels] = useState<ReadonlySet<string>>(NOTHING_OPEN)
  const labels = accordionLabelsOf(blocks)
  const areAllOpen = labels.length > 0 && labels.every((label) => openLabels.has(label))
  const groups: readonly NavigatorGroup[] = labels.length === 0
    ? []
    : [[
        navigatorButtonOf({
          key: EXPAND_ALL_KEY,
          actionId: "expand-context-action",
          label: areAllOpen ? COLLAPSE_ALL_LABEL : EXPAND_ALL_LABEL,
          onRun: () => { setOpenLabels(areAllOpen ? NOTHING_OPEN : new Set(labels)) },
        }),
      ]]
  useNavigatorSection(anchorId, groups)
  return {
    openLabels,
    onToggle: (label) => { setOpenLabels((current) => toggled(current, label)) },
  }
}
