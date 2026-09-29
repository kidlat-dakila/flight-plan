import { useEffect, useRef } from "react"
import { makeHeadingsCollapsible } from "../collapsible"
import { renderMarkdown } from "../markdown"

/**
 * Prose, rendered outside React.
 *
 * `markdown` is an agent's prose field, rendered by the UI's one Markdown
 * renderer (`../markdown`). `html` is prose
 * the document view already built around such a field — a heading and the
 * context under it, the Overview list (`document/view.ts`). One of the two.
 *
 * React owns the wrapper element and never its children: they are set as
 * HTML, and the headings in them get their fold arrows afterwards.
 */
export function HostMarkdown({
  markdown,
  html,
  className,
  blockLevel,
  node,
  hidden,
  collapsible = true,
}: {
  markdown?: string
  html?: string
  className?: string
  /**
   * The waypoint this prose belongs to, when it belongs to one.
   *
   * Written onto the wrapper so a selection can say which waypoint it is in:
   * a copied reference names the waypoint by its id and quotes the text.
   */
  node?: string
  /** Level of the block's first heading, used when folding across blocks. */
  blockLevel?: number
  /** Hides the block without unmounting it, so folding keeps its state. */
  hidden?: boolean
  /**
   * Whether headings in this block get fold arrows. Default on.
   *
   * Off for prose shown as *reference* rather than as the document — inside a
   * waypoint's box or a panel. Folding there is not merely pointless, it
   * reaches into the document: the toggle hides sibling blocks found by
   * walking `.fp-root`.
   */
  collapsible?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const content = html ?? (markdown === undefined || markdown.trim() === "" ? "" : renderMarkdown(markdown))

  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.innerHTML = content
    if (content !== "" && collapsible) makeHeadingsCollapsible(element)
    return () => {
      element.replaceChildren()
    }
  }, [content, collapsible])

  return (
    <div
      ref={ref}
      className={className === undefined ? "fp-markdown" : `fp-markdown ${className}`}
      data-fp-block-level={blockLevel}
      data-fp-node={node}
      hidden={hidden}
    />
  )
}
