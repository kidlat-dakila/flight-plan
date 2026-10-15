export const TAB_LIST_CLASSES = "flex flex-wrap items-end gap-x-6 border-b border-border"

export const TAB_CLASSES
  = "-mb-px cursor-pointer border-b-2 border-transparent pb-2 text-sm font-bold text-muted-foreground transition-colors duration-[180ms] ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-selected:border-[var(--line,var(--color-primary))] aria-selected:text-foreground"

const FIRST_TAB = 0

export const tabIndexAfterKey = (key: string, openIndex: number, tabCount: number): number | null => {
  const lastTab = tabCount - 1
  if (key === "ArrowRight") return openIndex === lastTab ? FIRST_TAB : openIndex + 1
  if (key === "ArrowLeft") return openIndex === FIRST_TAB ? lastTab : openIndex - 1
  if (key === "Home") return FIRST_TAB
  if (key === "End") return lastTab
  return null
}
