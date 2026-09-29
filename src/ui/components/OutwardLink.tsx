import type { ReactNode } from "react"
import { useHost } from "../host"

/**
 * A link out of the walkthrough: to a pull request, a diff, a permalink.
 *
 * One component for all of them, because all three had grown the same two
 * lines and only one of the two was reliable. It keeps a real `href`, so
 * copy-link and middle-click still work and a host with no `openExternal`
 * behaves exactly as it did.
 */
export function OutwardLink({
  href,
  title,
  className,
  children,
}: {
  href: string
  title: string
  className?: string
  children: ReactNode
}) {
  const host = useHost()
  return (
    <a
      className={className}
      href={href}
      title={title}
      aria-label={title}
      onClick={(event) => {
        // Selecting prose ends in a click, and a diagram card is clickable
        // underneath: neither is a request to change waypoint.
        event.stopPropagation()
        // Handed to the host rather than followed. See `openExternal` in
        // `host.ts` for why an anchor is not enough in a webview.
        event.preventDefault()
        host.openExternal(href)
      }}
    >
      {children}
    </a>
  )
}
