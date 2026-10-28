import { ChevronDownIcon } from "lucide-react"
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/blocks/dropdown-menu"
import { TAB_CLASSES, TAB_LIST_CLASSES, TAB_RULE_CLASSES, tabIndexAfterKey, visibleTabIndexesOf, type TabRowMeasures } from "@/lib/tab-bar"
import { cn } from "@/lib/utils"

export interface RowTab {
  readonly key: string
  readonly label: string
  readonly id?: string
  readonly controlsId?: string
}

interface TabRowProps {
  readonly tabs: readonly RowTab[]
  readonly openIndex: number
  readonly label?: string
  readonly className?: string
  readonly onOpen: (index: number) => void
}

interface IndexedTab {
  readonly tab: RowTab
  readonly index: number
}

const ROW_CLASSES = `relative flex items-end gap-1 ${TAB_RULE_CLASSES}`
const ROW_TAB_LIST_CLASSES = "min-w-0 flex-nowrap overflow-hidden"
const OPEN_TAB_WEIGHT_CLASSES = "font-semibold"
const MORE_BUTTON_CLASSES = "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md pr-2 pl-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-expanded:bg-muted aria-expanded:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
const RULER_FRAME_CLASSES = "pointer-events-none invisible absolute inset-0 overflow-hidden"
const RULER_CLASSES = "absolute top-0 left-0 flex w-max gap-1"
const RULER_TAB_SELECTOR = "[data-ruler-tab]"
const RULER_MORE_BUTTON_SELECTOR = "[data-ruler-more-button]"
const SIGNATURE_SEPARATOR = "\n"
const KEY_LABEL_SEPARATOR = "\t"
const NO_GAP = 0

const UNMEASURED: TabRowMeasures = { tabWidths: [], gap: NO_GAP, rowWidth: 0, moreButtonWidth: 0 }

const moreTextOf = (count: number): string => `${String(count)} more`

const moreLabelOf = (count: number): string => `${moreTextOf(count)} ${count === 1 ? "tab" : "tabs"}`

const widthOf = (element: Element | null): number => element?.getBoundingClientRect().width ?? 0

const gapOf = (element: Element): number => {
  const gap = Number.parseFloat(getComputedStyle(element).columnGap)
  return Number.isNaN(gap) ? NO_GAP : gap
}

const measuresOf = (row: Element, ruler: Element): TabRowMeasures => ({
  tabWidths: [...ruler.querySelectorAll(RULER_TAB_SELECTOR)].map(widthOf),
  gap: gapOf(ruler),
  rowWidth: widthOf(row),
  moreButtonWidth: widthOf(ruler.querySelector(RULER_MORE_BUTTON_SELECTOR)),
})

const tabSignatureOf = (tabs: readonly RowTab[]): string =>
  tabs.map((tab) => `${tab.key}${KEY_LABEL_SEPARATOR}${tab.label}`).join(SIGNATURE_SEPARATOR)

const isSameMeasures = (first: TabRowMeasures, second: TabRowMeasures): boolean =>
  first.gap === second.gap
  && first.rowWidth === second.rowWidth
  && first.moreButtonWidth === second.moreButtonWidth
  && first.tabWidths.length === second.tabWidths.length
  && first.tabWidths.every((width, index) => width === second.tabWidths[index])

const tabButtonOf = (tabList: Element | null, index: number): HTMLButtonElement | null =>
  tabList?.querySelector<HTMLButtonElement>(`[data-tab-index="${String(index)}"]`) ?? null

const useTabRowMeasures = (row: HTMLElement | null, ruler: HTMLElement | null, tabSignature: string): TabRowMeasures => {
  const [measures, setMeasures] = useState(UNMEASURED)

  useLayoutEffect(() => {
    if (row === null || ruler === null || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(() => {
      const next = measuresOf(row, ruler)
      setMeasures((current) => (isSameMeasures(current, next) ? current : next))
    })
    const measuredElements = [row, ...ruler.querySelectorAll(`${RULER_TAB_SELECTOR}, ${RULER_MORE_BUTTON_SELECTOR}`)]
    measuredElements.forEach((element) => {
      observer.observe(element)
    })
    return () => {
      observer.disconnect()
    }
  }, [row, ruler, tabSignature])

  return measures
}

interface RulerProps {
  readonly tabs: readonly RowTab[]
  readonly onRuler: (ruler: HTMLDivElement | null) => void
}

const Ruler = ({ tabs, onRuler }: RulerProps) => (
  <div aria-hidden="true" className={RULER_FRAME_CLASSES}>
    <div ref={onRuler} className={RULER_CLASSES}>
      {tabs.map((tab) => <span key={tab.key} data-ruler-tab className={cn(TAB_CLASSES, OPEN_TAB_WEIGHT_CLASSES)}>{tab.label}</span>)}
      <span data-ruler-more-button className={MORE_BUTTON_CLASSES}>
        {moreTextOf(tabs.length)}
        <ChevronDownIcon />
      </span>
    </div>
  </div>
)

interface MoreMenuProps {
  readonly hiddenTabs: readonly IndexedTab[]
  readonly onChoose: (index: number) => void
  readonly shouldFocusTriggerAfterClose: () => boolean
}

const MoreMenu = ({ hiddenTabs, onChoose, shouldFocusTriggerAfterClose }: MoreMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger aria-label={moreLabelOf(hiddenTabs.length)} className={MORE_BUTTON_CLASSES}>
      {moreTextOf(hiddenTabs.length)}
      <ChevronDownIcon aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" finalFocus={shouldFocusTriggerAfterClose}>
      {hiddenTabs.map(({ tab, index }) => (
        <DropdownMenuItem key={tab.key} onClick={() => { onChoose(index) }}>{tab.label}</DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)

const TabRow = ({ tabs, openIndex, label, className, onOpen }: TabRowProps) => {
  const [row, setRow] = useState<HTMLDivElement | null>(null)
  const [ruler, setRuler] = useState<HTMLDivElement | null>(null)
  const [tabList, setTabList] = useState<HTMLDivElement | null>(null)
  const focusRequestRef = useRef<number | null>(null)
  const isChoosingFromMenuRef = useRef(false)
  const measures = useTabRowMeasures(row, ruler, tabSignatureOf(tabs))
  const visibleIndexes = new Set(visibleTabIndexesOf(measures, tabs.length, openIndex))
  const indexedTabs = tabs.map((tab, index) => ({ tab, index }))
  const visibleTabs = indexedTabs.filter(({ index }) => visibleIndexes.has(index))
  const hiddenTabs = indexedTabs.filter(({ index }) => !visibleIndexes.has(index))
  const visibleKey = visibleTabs.map(({ index }) => String(index)).join(SIGNATURE_SEPARATOR)

  useLayoutEffect(() => {
    if (focusRequestRef.current !== openIndex) return
    focusRequestRef.current = null
    tabButtonOf(tabList, openIndex)?.focus()
  }, [tabList, openIndex, visibleKey])

  const moveWithKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const nextIndex = tabIndexAfterKey(event.key, openIndex, tabs.length)
    if (nextIndex === null) return
    event.preventDefault()
    if (nextIndex === openIndex) return
    focusRequestRef.current = nextIndex
    onOpen(nextIndex)
  }

  const chooseHiddenTab = (index: number): void => {
    isChoosingFromMenuRef.current = true
    focusRequestRef.current = index
    onOpen(index)
  }

  const shouldFocusTriggerAfterClose = (): boolean => {
    const isChoosingFromMenu = isChoosingFromMenuRef.current
    isChoosingFromMenuRef.current = false
    return !isChoosingFromMenu
  }

  return (
    <div ref={setRow} className={cn(ROW_CLASSES, className)}>
      <div ref={setTabList} role="tablist" aria-label={label} className={cn(TAB_LIST_CLASSES, ROW_TAB_LIST_CLASSES)}>
        {visibleTabs.map(({ tab, index }) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={tab.id}
            aria-selected={index === openIndex}
            aria-controls={tab.controlsId}
            tabIndex={index === openIndex ? 0 : -1}
            data-tab-index={index}
            className={TAB_CLASSES}
            onClick={() => { onOpen(index) }}
            onKeyDown={moveWithKey}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {hiddenTabs.length === 0 ? null : <MoreMenu hiddenTabs={hiddenTabs} onChoose={chooseHiddenTab} shouldFocusTriggerAfterClose={shouldFocusTriggerAfterClose} />}
      <Ruler tabs={tabs} onRuler={setRuler} />
    </div>
  )
}

export default TabRow
