import { useEffect, useEffectEvent } from "react"

const NEXT_KEY = "j"
const PREVIOUS_KEY = "k"
const TYPING_ELEMENTS = "input, textarea, select, [contenteditable='true']"

const isTyping = (target: EventTarget | null): boolean => target instanceof Element && target.closest(TYPING_ELEMENTS) !== null

export const useStepShortcuts = (onPrevious: () => void, onNext: () => void): void => {
  const stepBack = useEffectEvent(onPrevious)
  const stepForward = useEffectEvent(onNext)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (event.key === NEXT_KEY) stepForward()
      if (event.key === PREVIOUS_KEY) stepBack()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])
}
