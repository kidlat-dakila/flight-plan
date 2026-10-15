const SITE_HOME_URL = "/"
const APP_HOME_LINK_SELECTOR = "header a[href$='#/']"
const NEW_TAB_TARGET = "_blank"

const isAppHomeLink = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(APP_HOME_LINK_SELECTOR) !== null

const opensNewTab = (event: MouseEvent): boolean => event.metaKey || event.ctrlKey || event.shiftKey

export const keepHomeLinkOnSite = (): void => {
  document.addEventListener(
    "click",
    (event) => {
      if (!isAppHomeLink(event.target)) return
      event.preventDefault()
      if (opensNewTab(event)) window.open(SITE_HOME_URL, NEW_TAB_TARGET)
      else window.location.assign(SITE_HOME_URL)
    },
    { capture: true },
  )
}
