import { useCallback, useEffect, useState } from "react"

export interface BrowserPath {
  readonly pathname: string
  readonly navigate: (path: string) => void
  readonly redirect: (path: string) => void
}

export interface PointerClick {
  readonly button: number
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly defaultPrevented: boolean
}

const MAIN_BUTTON = 0
const POPSTATE_EVENT = "popstate"

export const isPlainClick = ({ button, metaKey, ctrlKey, shiftKey, altKey, defaultPrevented }: PointerClick): boolean =>
  button === MAIN_BUTTON && !metaKey && !ctrlKey && !shiftKey && !altKey && !defaultPrevented

const readPathname = (): string => window.location.pathname

export const useBrowserPath = (): BrowserPath => {
  const [pathname, setPathname] = useState(readPathname)
  useEffect(() => {
    const followHistory = (): void => {
      setPathname(readPathname())
    }
    window.addEventListener(POPSTATE_EVENT, followHistory)
    return () => {
      window.removeEventListener(POPSTATE_EVENT, followHistory)
    }
  }, [])
  const navigate = useCallback((path: string): void => {
    if (path === readPathname()) return
    window.history.pushState(null, "", path)
    setPathname(path)
  }, [])
  const redirect = useCallback((path: string): void => {
    window.history.replaceState(null, "", path)
    setPathname(path)
  }, [])
  return { pathname, navigate, redirect }
}
