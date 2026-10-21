const BAND_HEIGHT_PX = 56
const PINNED_ROW_SELECTOR = "[data-pinned-row]"

export const PINNED_ROW_PROPS = { "data-pinned-row": "" } as const

export const coveredTopOf = (): number =>
  Math.max(BAND_HEIGHT_PX, ...[...document.querySelectorAll(PINNED_ROW_SELECTOR)].map((row) => row.getBoundingClientRect().bottom))
