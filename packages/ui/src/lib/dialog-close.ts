import type { Dialog } from "@base-ui/react/dialog"

type OpenChangeHandler = NonNullable<Dialog.Root.Props["onOpenChange"]>

const ESCAPE_KEY_REASON = "escape-key"

const isOpenSuggestionList = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.getAttribute("aria-expanded") === "true"

export const closeUnlessSuggestionsOpen = (onClose: () => void): OpenChangeHandler => (isNextOpen, details) => {
  if (isNextOpen) return
  if (details.reason === ESCAPE_KEY_REASON && isOpenSuggestionList(details.event.target)) details.cancel()
  else onClose()
}
