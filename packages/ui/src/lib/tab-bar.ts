export const TAB_RULE_CLASSES = "shadow-[inset_0_-1px_0_var(--color-border)]"

export const TAB_LIST_CLASSES = `flex flex-wrap items-end gap-1 ${TAB_RULE_CLASSES}`

export const TAB_CLASSES
  = "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-t-md border border-b-0 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-selected:border-border aria-selected:bg-background aria-selected:font-semibold aria-selected:text-foreground aria-selected:hover:bg-background"

const FIRST_TAB = 0

export const tabIndexAfterKey = (key: string, openIndex: number, tabCount: number): number | null => {
  const lastTab = tabCount - 1
  if (key === "ArrowRight") return openIndex === lastTab ? FIRST_TAB : openIndex + 1
  if (key === "ArrowLeft") return openIndex === FIRST_TAB ? lastTab : openIndex - 1
  if (key === "Home") return FIRST_TAB
  if (key === "End") return lastTab
  return null
}

export interface TabRowMeasures {
  readonly tabWidths: readonly number[]
  readonly gap: number
  readonly rowWidth: number
  readonly moreButtonWidth: number
}

interface Fitting {
  readonly indexes: readonly number[]
  readonly usedWidth: number
  readonly isFull: boolean
}

const NO_FITTING: Fitting = { indexes: [], usedWidth: 0, isFull: false }

const sum = (widths: readonly number[]): number => widths.reduce((total, width) => total + width, 0)

const rowWidthOf = (widths: readonly number[], gap: number): number =>
  widths.length === 0 ? 0 : sum(widths) + gap * (widths.length - 1)

const leadingTabIndexesOf = (tabWidths: readonly number[], gap: number, availableWidth: number): readonly number[] =>
  tabWidths.reduce<Fitting>((fitting, width, index) => {
    const usedWidth = fitting.usedWidth + width + (fitting.indexes.length > 0 ? gap : 0)
    return fitting.isFull || usedWidth > availableWidth
      ? { ...fitting, isFull: true }
      : { indexes: [...fitting.indexes, index], usedWidth, isFull: false }
  }, NO_FITTING).indexes

export const fittingTabIndexesOf = (
  tabWidths: readonly number[],
  gap: number,
  availableWidth: number,
  openIndex: number,
): readonly number[] => {
  const leading = leadingTabIndexesOf(tabWidths, gap, availableWidth)
  if (leading.includes(openIndex)) return leading
  const openTabWidth = tabWidths[openIndex] ?? 0
  const widthBeforeOpenTab = (indexes: readonly number[]): number =>
    sum(indexes.map((index) => tabWidths[index] ?? 0)) + gap * indexes.length
  const hasRoomForOpenTab = (indexes: readonly number[]): boolean =>
    widthBeforeOpenTab(indexes) + openTabWidth <= availableWidth
  const trimmed = leading.reduce<readonly number[]>(
    (kept) => (hasRoomForOpenTab(kept) ? kept : kept.slice(0, -1)),
    leading,
  )
  return [...trimmed, openIndex]
}

const allIndexesOf = (count: number): readonly number[] => Array.from({ length: count }, (_, index) => index)

const isMeasuredFor = (measures: TabRowMeasures, tabCount: number): boolean =>
  measures.rowWidth > 0 && measures.tabWidths.length === tabCount

export const visibleTabIndexesOf = (measures: TabRowMeasures, tabCount: number, openIndex: number): readonly number[] => {
  const { tabWidths, gap, rowWidth, moreButtonWidth } = measures
  const canShowEveryTab = !isMeasuredFor(measures, tabCount) || rowWidthOf(tabWidths, gap) <= rowWidth
  return canShowEveryTab
    ? allIndexesOf(tabCount)
    : fittingTabIndexesOf(tabWidths, gap, rowWidth - moreButtonWidth - gap, openIndex)
}
