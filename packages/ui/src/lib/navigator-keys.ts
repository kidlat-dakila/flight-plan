const TYPING_ELEMENTS = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='searchbox'], [role='combobox']"
const FOREIGN_LAYERS = "[role='dialog']:not([data-navigator-scope]), [role='alertdialog']"
const OPEN_MODAL = "[aria-modal='true']:not([data-navigator-scope])"
const CONTROL_CHORD_PREFIX = "ctrl+"

export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(TYPING_ELEMENTS) !== null

const isInForeignLayer = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(FOREIGN_LAYERS) !== null

export const isNavigatorKeyEvent = (event: KeyboardEvent): boolean =>
  !event.defaultPrevented
  && !event.repeat
  && !event.isComposing
  && !event.metaKey
  && !event.altKey
  && !isTypingTarget(event.target)
  && !isInForeignLayer(event.target)
  && document.querySelector(OPEN_MODAL) === null

export const navigatorKeyOf = (event: KeyboardEvent): string =>
  event.ctrlKey ? `${CONTROL_CHORD_PREFIX}${event.key.toLowerCase()}` : event.key.toLowerCase()
