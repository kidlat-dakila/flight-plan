const EDITOR_DRAG_EVENTS = ["dragenter", "dragover", "dragleave", "drop", "dragend"] as const

const stopBubbling = (event: Event) => {
  event.stopPropagation()
}

const keepDragsFromEditor = (element: HTMLElement | null) => {
  if (element === null) return
  EDITOR_DRAG_EVENTS.forEach((eventName) => {
    element.addEventListener(eventName, stopBubbling)
  })
  return () => {
    EDITOR_DRAG_EVENTS.forEach((eventName) => {
      element.removeEventListener(eventName, stopBubbling)
    })
  }
}

export const isInside = (target: EventTarget | null, selector: string): boolean =>
  target instanceof Element && target.closest(selector) !== null

export default keepDragsFromEditor
