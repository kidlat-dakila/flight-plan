import { ControlButton } from "@xyflow/react"
import { useEffect, useRef, useState, type RefObject } from "react"

/**
 * Taking one board over the whole panel, and putting it back.
 *
 * Extracted from `Diagram` when the blast radius became a second board, because
 * every hard-won detail in here is about *a board in this layout* rather than
 * about diagrams: the portal out of the reading column, the two attributes, the
 * Escape ordering. A second copy would have been a second place for those to be
 * got subtly wrong.
 *
 * **The root attribute keeps the name `fpDiagramFullscreen`.** It reads as a
 * lie now that two kinds of board set it, and renaming it would be worse: every
 * rule in `renderer.css` that turns the reading column into a floating overlay
 * keys on it, and the thing those rules actually care about is "some board is
 * filling the screen", which is exactly what both cases mean. The name is
 * historical; the meaning was always this.
 */

export type Maximised = {
  full: boolean
  setFull: (full: boolean) => void
  /** Put on the board's own `<figure>`. */
  figureRef: RefObject<HTMLElement>
  /** Where to portal the board while it is maximised, or null when it is not. */
  layer: HTMLElement | null
}

export function useMaximisedBoard(options: {
  /** Class for the portal layer, which its own stylesheet sizes. */
  layerClass: string
  /**
   * Called on Escape, before leaving.
   *
   * Return true when it handled the key, which keeps the board maximised.
   * Escape undoes one thing at a time, and whatever was most recently asked for
   * goes first.
   */
  onEscape?: () => boolean
}): Maximised {
  const { layerClass, onEscape } = options
  const figureRef = useRef<HTMLElement>(null)
  const [full, setFull] = useState(false)
  const [layer, setLayer] = useState<HTMLElement | null>(null)

  /*
   * Full screen is two attributes, not one piece of React state threaded
   * through the layout.
   *
   * The figure marks itself, and the layout root is told that *a* board has gone
   * full screen — which is what the prose column needs to know, and it is three
   * components away with the block list in between. Setting a `data-` attribute
   * on an ancestor is how the column splitter already talks to the row it
   * resizes, so this follows a path that exists rather than adding a context for
   * one boolean.
   *
   * Two attributes rather than one because a document holds several boards: the
   * root attribute decides the overlay, and the figure's own decides which board
   * is the one filling the screen.
   */
  useEffect(() => {
    const figure = figureRef.current
    if (figure === null) return
    const root = figure.closest<HTMLElement>(".fp-root")

    if (!full) {
      delete figure.dataset["fpFullscreen"]
      if (root !== null) delete root.dataset["fpDiagramFullscreen"]
      setLayer(null)
      return
    }

    figure.dataset["fpFullscreen"] = "true"
    if (root === null) return
    root.dataset["fpDiagramFullscreen"] = "true"

    /*
     * A layer of its own, appended beside the reading column rather than inside
     * it.
     *
     * The first attempt kept the board where it was and made the figure
     * `position: fixed`, which put it over the whole panel — correctly, and
     * uselessly. The figure is a descendant of the reading column, so once that
     * column is a positioned overlay it becomes a stacking context and no
     * `z-index` on a descendant can paint below its own ancestor. Only leaving
     * the subtree fixes that, and a portal leaves the DOM subtree while keeping
     * the React one: anything reading a provider above still reads the same one,
     * which is the whole reason a board inside a walkthrough is worth having.
     */
    const created = root.ownerDocument.createElement("div")
    created.className = layerClass
    root.appendChild(created)
    setLayer(created)

    return () => {
      delete figure.dataset["fpFullscreen"]
      delete root.dataset["fpDiagramFullscreen"]
      created.remove()
      setLayer(null)
    }
  }, [full, layerClass])

  // Escape leaves, which is what every other full-screen surface does and the
  // only way out for somebody who has scrolled the button off screen.
  useEffect(() => {
    if (!full) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      if (onEscape?.() === true) return
      setFull(false)
    }
    const doc = figureRef.current?.ownerDocument ?? document
    doc.addEventListener("keydown", onKey)
    return () => {
      doc.removeEventListener("keydown", onKey)
    }
  }, [full, onEscape])

  return { full, setFull, figureRef, layer }
}

/**
 * Four corner brackets: React Flow's own fit-view mark, on our button.
 *
 * Copied rather than imported, because the library does not export its icons.
 *
 * This is the mark the full-screen button had been sitting next to, and a
 * reader already reads corner brackets as "make this bigger" — which is what
 * full screen does and what fit-view only approximated. Two buttons a step
 * apart doing almost the same thing is what made the pair confusing; one of
 * them keeping the icon is what resolves it.
 *
 * The viewBox is theirs too. It is not square, and squaring it would distort
 * the brackets.
 */
function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30">
      <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
    </svg>
  )
}

/**
 * Takes the board over the whole panel, and back.
 *
 * Shared by every board in the layout, which is why it says "board" rather than
 * "diagram": the blast radius maximises the same way and through the same CSS.
 *
 * The reading column becomes a floating overlay on the right rather than
 * disappearing, so the binding still works in full screen: scrolling the prose
 * still lights up nodes, and clicking a node still moves the prose. A
 * full-screen map you cannot read the tour beside would be a picture.
 *
 * Nothing re-frames the board from here: going full screen remounts it through
 * a portal, so `Frame` runs against the new size on the new mount. An effect
 * that re-framed the existing board measured the size it had a frame earlier
 * and left the cards in a thin strip at the top left.
 */
export function FullScreenButton({
  full,
  onToggle,
}: {
  full: boolean
  onToggle: () => void
}) {
  const label = full ? "Leave full screen" : "Full screen"
  return (
    <ControlButton
      title={label}
      aria-label={label}
      // The icon does not change between the two states, so this is what says
      // which one it is in — to a screen reader through the attribute, and to
      // everyone else through the style keyed on it in `diagram.css`.
      aria-pressed={full}
      onClick={onToggle}
    >
      <ExpandIcon />
    </ControlButton>
  )
}

