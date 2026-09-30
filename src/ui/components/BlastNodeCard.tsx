import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useState, type JSX } from "react"
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useFloating,
  useHover,
  useInteractions,
} from "@floating-ui/react"
import { HostMarkdown } from "./HostMarkdown"
import type { BlastNode } from "../../lib/schemas/diagram/blast"
import { verdictOf, type FileGroup, type Verdict } from "../diagram/blastLayout"

/**
 * The two cards a blast radius draws.
 *
 * A declaration, and a file standing in for the declarations inside it. They are
 * one module because they are one design: a folded file has to read as the same
 * kind of object as what it folds, or opening one looks like navigating
 * somewhere rather than zooming in.
 *
 * Both are terse on purpose. The board is the map — how far the change reaches
 * and how badly — and the reasoning behind any one verdict is a click away
 * rather than on the card, for the reason `DiagramNodeCard` gives: detail on
 * every card makes every card enormous and the map unreadable.
 */

/** The word a reviewer reads, which is not the value the schema stores. */
const VERDICT: Record<Verdict, string> = {
  breaks: "Breaks",
  "behaviour-changes": "Changes",
  unaffected: "Unaffected",
  unassessed: "Unassessed",
  changed: "Changed",
}

/** The last segment of a path, which is what fits on a card. */
const basename = (path: string): string => path.split("/").pop() ?? path

/**
 * What a card is handed.
 *
 * The node and nothing else. Clicks are the board's — `BlastGraph` takes them
 * through React Flow's own `onNodeClick`, the way `Diagram` does, so a card
 * never has to know what a click means. It also never opens a file: a blast node
 * is a position in a graph rather than a place to go.
 */
export type BlastCardData = {
  node: BlastNode
}

/** Gap between the card and its hover panel, and the padding that keeps it on screen. */
const HOVER_OFFSET = 8

export function BlastNodeCard({ data }: NodeProps): JSX.Element {
  const { node } = data as unknown as BlastCardData
  const shielded = node.shieldedBy !== undefined
  const open = node.unproven !== undefined && node.unproven.runtime === undefined

  const [showing, setShowing] = useState(false)

  /*
   * A hover panel rather than a `title` attribute.
   *
   * `contract` and `effect` are Markdown and carry `code:` links, so the thing
   * they are about is one click away. A native tooltip renders neither: it would
   * show the link syntax as text and swallow the one affordance the field exists
   * for. Same machinery as the diagram's card, for the same reasons written
   * there.
   */
  const { refs, floatingStyles, context } = useFloating({
    open: showing,
    onOpenChange: setShowing,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [
      offset(HOVER_OFFSET),
      flip({ padding: HOVER_OFFSET }),
      shift({ padding: HOVER_OFFSET }),
    ],
    whileElementsMounted: autoUpdate,
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { handleClose: safePolygon() }),
  ])

  const detail =
    node.contract !== undefined || node.effect !== undefined || node.description !== undefined

  return (
    <div
      ref={refs.setReference}
      {...getReferenceProps()}
      className={[
        "fp-bl-card",
        `fp-bl-${verdictOf(node)}`,
        /*
         * Provenance is weight, not colour. A reviewer scanning the board should
         * be able to see how much of it somebody actually looked at, and colour
         * is already carrying the verdict.
         */
        shielded ? "fp-bl-inherited" : "fp-bl-authored",
        open ? "fp-bl-unproven" : "",
        // A changed node's verdict class is `fp-bl-changed` itself.
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle type="target" position={Position.Top} />
      <div className="fp-bl-label">{node.label}</div>
      <div className="fp-bl-sub">{node.sublabel ?? basename(node.path)}</div>
      <div className="fp-bl-foot">
        <span className="fp-bl-chip">{open ? "Unproven" : VERDICT[verdictOf(node)]}</span>
        {shielded ? <span className="fp-bl-via">via {node.shieldedBy}</span> : null}
        {node.tag === undefined ? null : <span className="fp-bl-tag">{node.tag}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} />

      {showing && detail ? (
        <FloatingPortal>
          <div
            className="fp-bl-hover"
            role="tooltip"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <p className="fp-bl-hover-title">{node.label}</p>
            {node.contract === undefined ? null : (
              <>
                {node.contract.before === null ? (
                  <p className="fp-bl-hover-was">Did not exist before this change.</p>
                ) : (
                  <div className="fp-bl-hover-was">
                    <span className="fp-bl-hover-when">Before</span>
                    <HostMarkdown
                      className="fp-bl-hover-prose"
                      markdown={node.contract.before}
                    />
                  </div>
                )}
                <div className="fp-bl-hover-now">
                  <span className="fp-bl-hover-when">Now</span>
                  <HostMarkdown className="fp-bl-hover-prose" markdown={node.contract.now} />
                </div>
              </>
            )}
            {node.effect === undefined ? null : (
              <HostMarkdown className="fp-bl-hover-prose" markdown={node.effect} />
            )}
            {node.description === undefined ? null : (
              <HostMarkdown className="fp-bl-hover-prose" markdown={node.description} />
            )}
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  )
}

export type BlastFileData = {
  group: FileGroup
}

/**
 * A folded file.
 *
 * Carries the count and the worst verdict inside it, which is what makes folding
 * an act of zooming rather than of hiding: everything the card stands for is
 * summarised on its face, and every edge that crossed its boundary still
 * crosses the card's.
 *
 * `authored` is drawn beside the count because the difference between "nine
 * declarations, nine assessed" and "nine declarations, one assessed" is the
 * difference between a reviewed file and an unreviewed one, and nothing else on
 * the board says which this is.
 */
export function BlastFileCard({ data }: NodeProps): JSX.Element {
  const { group } = data as unknown as BlastFileData

  return (
    <div
      className={[
        "fp-bl-card",
        "fp-bl-file",
        `fp-bl-${group.worst}`,
        group.unproven ? "fp-bl-unproven" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={group.path}
    >
      <Handle type="target" position={Position.Top} />
      <div className="fp-bl-label">{basename(group.path)}</div>
      <div className="fp-bl-sub">{group.path}</div>
      <div className="fp-bl-foot">
        <span className="fp-bl-chip">{VERDICT[group.worst]}</span>
        <span className="fp-bl-count">
          {group.ids.length} · {group.authored} assessed
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
