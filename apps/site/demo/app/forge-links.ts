import type { DemoReview } from "@flightplan/backend/demo-reviews"

const FORGE_URL = "https://github.com/"
const NOTE_DURATION_MS = 4000
const NOTE_CLASS = "demo-note"
const DEMO_FORGE_MESSAGE = "This pull request lives only in the demo, so it has no page on GitHub."

const demoForgePrefixesOf = (demos: readonly DemoReview[]): readonly string[] =>
  demos.map((demo) => `${FORGE_URL}${demo.story.repository.forgeSlug}`)

const isDemoForgeLink = (target: EventTarget | null, prefixes: readonly string[]): boolean => {
  const link = target instanceof Element ? target.closest("a[href]") : null
  return link !== null && prefixes.some((prefix) => (link.getAttribute("href") ?? "").startsWith(prefix))
}

const showNote = (message: string): void => {
  const note = document.createElement("p")
  note.setAttribute("class", NOTE_CLASS)
  note.setAttribute("role", "status")
  note.append(message)
  document.body.append(note)
  setTimeout(() => {
    note.remove()
  }, NOTE_DURATION_MS)
}

export const keepForgeLinksInDemo = (demos: readonly DemoReview[]): void => {
  const prefixes = demoForgePrefixesOf(demos)
  document.addEventListener(
    "click",
    (event) => {
      if (!isDemoForgeLink(event.target, prefixes)) return
      event.preventDefault()
      showNote(DEMO_FORGE_MESSAGE)
    },
    { capture: true },
  )
}
