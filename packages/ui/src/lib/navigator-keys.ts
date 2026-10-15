const TYPING_ELEMENTS = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='searchbox'], [role='combobox']"
const FOREIGN_LAYERS = "[role='dialog']:not([data-navigator-scope]), [role='alertdialog']"
const OPEN_MODAL = "[aria-modal='true']:not([data-navigator-scope])"

export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(TYPING_ELEMENTS) !== null

const isInForeignLayer = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(FOREIGN_LAYERS) !== null

export const isNavigatorKeyEvent = (event: KeyboardEvent): boolean =>
  !event.defaultPrevented
  && !event.repeat
  && !event.isComposing
  && !event.metaKey
  && !event.ctrlKey
  && !event.altKey
  && !isTypingTarget(event.target)
  && !isInForeignLayer(event.target)
  && document.querySelector(OPEN_MODAL) === null
