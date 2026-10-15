const ANCHOR_LINK_SELECTOR = "a[href^='#']"
const HASH_PREFIX_LENGTH = 1

const anchorIdOf = (target: EventTarget | null): string | null => {
  const link = target instanceof Element ? target.closest(ANCHOR_LINK_SELECTOR) : null
  return link === null ? null : (link.getAttribute("href") ?? "").slice(HASH_PREFIX_LENGTH)
}

export const keepAnchorLinksOnPage = (): void => {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return
    const anchorId = anchorIdOf(event.target)
    const anchor = anchorId === null || anchorId === "" ? null : document.getElementById(anchorId)
    if (anchor === null) return
    event.preventDefault()
    anchor.scrollIntoView({ block: "start" })
  })
}
