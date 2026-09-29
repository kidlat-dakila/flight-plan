import { useEffect, useState, type RefObject } from "react"
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react"
import { VscodeButton } from "../vscode"
import { useHost } from "../host"
import { buildAnnotationReference, buildFileReference } from "../reference"
import { nodeOf, spanOfRange } from "../selectionRange"

/** Gap between the selection and the button, in pixels. */
const OFFSET = 8
/** Keeps the button clear of the view's edges. */
const MARGIN = 4

type Popup = {
  reference: string
  /**
   * The selection's own box, in viewport coordinates.
   *
   * Kept as the rect the selection had when it was made, rather than as a
   * position worked out from it: the button is anchored to the selection, and
   * where that lands is the positioner's business, not this component's.
   */
  rect: DOMRect
}

/**
 * Offers a copyable reference for whatever text is selected.
 *
 * Positioned relative to the host box rather than the viewport, which is why
 * it is laid out with the absolute strategy and left where it is rather than
 * portalled out. `position: fixed` is not safe here: a containing block
 * anywhere above it — any ancestor with `contain`, `transform` or `filter` —
 * becomes the reference for fixed positioning, and viewport coordinates then
 * land somewhere else entirely. Staying put also keeps the button a descendant
 * of `.fp-root`, which is how the diagram's full-screen mode raises it.
 *
 * Dismissed on scroll rather than tracking the selection, which keeps it from
 * drifting away from the text it describes.
 */
export function SelectionReference({
  hostRef,
  toolHint,
  subject,
  qualify,
}: {
  hostRef: RefObject<HTMLElement | null>
  toolHint: string
  /** How the document is filed, for a prose reference: `review:acme/storefront#412`. */
  subject: string
  /**
   * Repository and commit to name, for files the reader cannot open locally.
   *
   * `unlessLocal` lists the paths that *are* on disk at the right commit; those
   * need no qualification, because a bare path already resolves for anything
   * reading the same working tree. Everything else is qualified, so an assistant
   * fetches the bytes the walkthrough means rather than whatever is checked out.
   */
  qualify?: { repo: string; sha: string; unlessLocal: string[] } | null
}) {
  const host = useHost()
  const [popup, setPopup] = useState<Popup | null>(null)
  /*
   * The host box, kept in state rather than read from the ref.
   *
   * It is the boundary the button is kept inside, and a boundary is read while
   * rendering, when a ref still holds null on the first pass and announces
   * nothing when it changes.
   */
  const [box, setBox] = useState<HTMLElement | null>(null)

  const { refs, floatingStyles } = useFloating({
    open: popup !== null,
    strategy: "absolute",
    // Above the selection, dropping below it when there is no room, and slid
    // along until it fits — which is every rule the hand-written version had.
    placement: "top",
    middleware: [
      offset(OFFSET),
      flip({ boundary: box ?? undefined, padding: MARGIN }),
      shift({ boundary: box ?? undefined, padding: MARGIN }),
    ],
    // The button is a custom element, so it has no size until it upgrades.
    // `autoUpdate` measures it again when it gets one.
    whileElementsMounted: autoUpdate,
  })

  // A selection is a rect, not an element, so the reference is virtual.
  useEffect(() => {
    if (popup === null) return
    refs.setPositionReference({ getBoundingClientRect: () => popup.rect })
  }, [popup, refs])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const doc = host.ownerDocument

    setBox(host)

    const update = () => {
      const selection = doc.getSelection()
      if (
        selection === null ||
        selection.isCollapsed ||
        selection.rangeCount === 0
      ) {
        setPopup(null)
        return
      }

      const range = selection.getRangeAt(0)
      if (!host.contains(range.commonAncestorContainer)) {
        setPopup(null)
        return
      }

      const span = spanOfRange(range)
      const rect = range.getBoundingClientRect()
      if (span === null || (rect.width === 0 && rect.height === 0)) {
        setPopup(null)
        return
      }

      setPopup({
        // Code selected in the panel belongs to a repository file, not to the
        // walkthrough, so it is copied as a path the assistant can open
        // directly. Prose is copied as a document reference, which only the
        // MCP tool can resolve.
        reference:
          span.file === undefined
            ? /*
               * Prose: named by the waypoint it sits in and quoted.
               *
               * Not by line: a JSON document's prose has none, and a
               * reference by line would point at nothing while looking like
               * one that points at something.
               */
              buildAnnotationReference({
                  subject,
                  node: nodeOf(range.commonAncestorContainer),
                  text: range.toString(),
                  toolHint,
                })
            : buildFileReference({
                path: span.file,
                from: span.from,
                to: span.to,
                at:
                  qualify == null || qualify.unlessLocal.includes(span.file)
                    ? null
                    : { repo: qualify.repo, sha: qualify.sha },
              }),
        rect,
      })
    }

    const hide = () => {
      setPopup(null)
    }

    doc.addEventListener("selectionchange", update)
    // Capture, so scrolling either column is caught rather than only the host.
    host.addEventListener("scroll", hide, true)

    return () => {
      doc.removeEventListener("selectionchange", update)
      host.removeEventListener("scroll", hide, true)
    }
  }, [hostRef, toolHint, subject, qualify])

  if (popup === null) return null

  return (
    <VscodeButton
      ref={refs.setFloating}
      className="fp-selection-copy"
      icon="copy"
      style={floatingStyles}
      // Keeps the selection alive: without this, pressing the button collapses
      // it and the reference is gone before the click lands.
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={(event) => {
        event.stopPropagation()
        navigator.clipboard.writeText(popup.reference).then(
          () => {
            host.notify("Reference copied")
          },
          () => {
            host.notify("Could not copy the reference")
          },
        )
      }}
    >
      Copy annotation path
    </VscodeButton>
  )
}
