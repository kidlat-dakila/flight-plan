import { Handle, Position, type NodeProps } from "@xyflow/react"
import { createContext, useContext, useEffect, useState } from "react"
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
import { OutwardLink } from "./OutwardLink"
import { VscodeButton } from "../vscode"
import { buildFileReference, referenceSubject } from "../reference"
import { useHost } from "../host"
import type { CodeNodeType, DiagramNode } from "../../lib/schemas/diagram/schema"
import type { DiagramExcerpt } from "./Diagram"

/**
 * The four sides a card can be entered or left by.
 *
 * The short names are the handle ids, and `Diagram` builds `s-bottom`/`t-top`
 * and the rest from the same four words, so the two files cannot drift into
 * naming the same side differently.
 */
const POSITIONS = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const

/**
 * One node, as a card with a hover card behind it.
 *
 * A node carrying a label, a path, a line range and a status is a card, not a
 * box with text, which is why no off-the-shelf renderer could draw it and why
 * React Flow's custom-node API was the deciding feature: the card is just a
 * component.
 *
 * The hover card is where the detail lives. Putting a description and a code
 * excerpt on the card itself would make every node enormous and the diagram
 * unreadable, and the diagram's job is to be the map. So the card stays terse
 * and hovering asks for more.
 */

/**
 * Which card was last clicked.
 *
 * A context rather than part of each node's data, and that is the whole point.
 * React Flow reads `measured` off the node object it is handed and keeps the
 * old measurements only when the object is the same identity; putting the
 * selection in the data made every node a new object on every selection
 * change, so React Flow threw away every measurement, and a node with no
 * measurements renders `visibility: hidden`. Selection is presentation: it
 * belongs where it changes the drawing, not where it rebuilds the graph.
 */
export const CardSelection = createContext<{
  /** Id of the card the reader last clicked, so it stays lit. */
  clicked: string | null
  /** Whether anything at all is active, which decides if the rest dim. */
  anyActive: boolean
}>({ clicked: null, anyActive: false })

/**
 * Expand / collapse of a card's execution steps.
 *
 * A context, not node `data`, for the reason {@link CardSelection} gives: React
 * Flow keeps a node's measured size only while the node object keeps its
 * identity, so per-card state that changed the object would throw those away and
 * flash the board blank. Which cards can collapse and which are collapsed is
 * presentation, so it rides here.
 */
export const CardCollapse = createContext<{
  /** Ids that have steps beneath them, so a toggle is offered. */
  collapsible: ReadonlySet<string>
  /** Ids whose steps are currently hidden. */
  collapsed: ReadonlySet<string>
  /** Flip one card between showing and hiding its steps. */
  onToggle: (id: string) => void
}>({ collapsible: new Set(), collapsed: new Set(), onToggle: () => {} })

/** Whether a card is the one being read, and whether it should recede. */
export function cardState(
  node: DiagramNode,
  clicked: string | null,
  anyActive: boolean,
): { active: boolean; dimmed: boolean } {
  const active = node.id === clicked
  return { active, dimmed: anyActive && !active }
}

export type CardData = {
  node: DiagramNode
  /** Highlighted excerpts, prepared by the host; one per source. */
  code: DiagramExcerpt[]
  /**
   * Whether clicking this card does anything.
   *
   * Decided by `Diagram`, which is the only place that can: it knows both the
   * waypoint titles a binding could resolve against and the excerpts a click
   * could open. Passed in rather than re-derived here, because three places
   * were deciding it separately and they disagreed — the card drew a pointer
   * whenever the node had sources, while the click handler acted only on a
   * `waypoint` and React Flow's `selectable` gated interaction on the same
   * field. A context node therefore looked clickable and did nothing.
   */
  clickable: boolean
}

/** Gap between the card and its popup, and between the popup and the board. */
const HOVER_OFFSET = 8

/** Short words for each type, drawn on the card so the icon is never alone. */
const TYPE_LABEL: Record<CodeNodeType, string> = {
  guard: "guard",
  logic: "logic",
  data: "data",
  type: "type",
  ui: "ui",
  config: "config",
}

/**
 * Hands the excerpt's reference to an assistant.
 *
 * The card used to render the code itself, which made it enormous, put a second
 * scrolling region inside a hovering popup, and duplicated what the code panel
 * already does better. A reference is the more useful thing to take away from a
 * map anyway: it is what you paste into an assistant, and it is the form this
 * whole project is built on.
 */
function CopyAnnotationPath({ excerpt }: { excerpt: CardData["code"][number] }) {
  const host = useHost()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  return (
    <VscodeButton
      secondary
      icon={copied ? "check" : "copy"}
      onClick={(event) => {
        event.stopPropagation()
        // A source with no range covers the whole file, and a whole-file
        // reference has no `#L` to add.
        const reference =
          excerpt.from === undefined || excerpt.to === undefined
            ? referenceSubject(excerpt.path, excerpt.at)
            : buildFileReference({
                path: excerpt.path,
                from: excerpt.from,
                to: excerpt.to,
                at: excerpt.at ?? null,
              })
        navigator.clipboard.writeText(reference).then(
          () => {
            setCopied(true)
          },
          () => {
            host.notify("Could not copy the annotation path")
          },
        )
      }}
    >
      {copied ? "Copied" : "Copy annotation path"}
    </VscodeButton>
  )
}

/**
 * The path above an excerpt, as a way to get to it.
 *
 * A link out to the pull request, or a button into the editor, or plain text
 * when the host offers neither. Never a dead `<a>` with no href, which is what
 * this used to render for every node whose file the change does not touch.
 */
function ExcerptLink({ excerpt }: { excerpt: CardData["code"][number] }) {
  const host = useHost()
  const where = `${excerpt.path} ${excerpt.lines}`
  const open = excerpt.open

  if (open == null) return <span>{where}</span>

  if (open.kind === "link") {
    return (
      <OutwardLink href={open.href} title={`See these lines ${open.label}`}>
        {where}
      </OutwardLink>
    )
  }

  const openFile = host.openFile
  return (
    <button
      type="button"
      className="fp-dg-hover-open"
      title={`Open ${open.path} at line ${String(open.line)}`}
      onClick={(event) => {
        event.stopPropagation()
        openFile(open.path, open.line)
      }}
    >
      {where}
    </button>
  )
}

export function DiagramNodeCard({ data }: NodeProps) {
  const card = data as unknown as CardData
  const { node, code } = card
  const selection = useContext(CardSelection)
  const collapse = useContext(CardCollapse)
  const collapsible = collapse.collapsible.has(node.id)
  const collapsed = collapse.collapsed.has(node.id)
  const { active, dimmed } = cardState(node, selection.clicked, selection.anyActive)
  const [open, setOpen] = useState(false)
  const detailed = node.description !== undefined || code.length > 0

  /*
   * Placed against the viewport, and drawn outside the board.
   *
   * The popup used to be a child of the card, pinned under it by CSS, which
   * made it two things at once: something inside React Flow's zoom transform,
   * so it shrank with the board until its own text was unreadable, and
   * something inside the board's box, so a card near an edge had its popup
   * clipped or pushed off. Out here it is measured in real pixels and kept on
   * screen by `flip` and `shift`. `autoUpdate` is what re-anchors it while the
   * reader pans or zooms underneath it.
   */
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [
      offset(HOVER_OFFSET),
      flip({ padding: HOVER_OFFSET }),
      shift({ padding: HOVER_OFFSET }),
    ],
    whileElementsMounted: autoUpdate,
  })

  /*
   * The popup survives the pointer moving onto it.
   *
   * It sits a gap below the card, so crossing that gap leaves the card — which
   * made the popup unreachable, and everything in it with it. `safePolygon`
   * keeps it open for a pointer heading towards it and closes it at once for a
   * pointer going anywhere else, which a grace period could only approximate.
   */
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { handleClose: safePolygon() }),
  ])

  return (
    <div
      className="fp-dg-card"
      data-type={node.type}
      data-active={active}
      data-dimmed={dimmed}
      /*
       * Clickable when it has code to go to, which is what a click is for.
       *
       * Keyed on `waypoint` before, so every context node — two thirds of a
       * call stack, by design — looked inert. A node with no source is still
       * inert, and correctly: there is nowhere for it to take you.
       */
      data-clickable={card.clickable}
      // Which cards are the change and which are the call stack around it.
      // Two independent axes: `data-dimmed` is about the waypoint being read
      // right now, this is about the pull request.
      data-changed={node.changed === true}
      // An escape marker: the value left static resolution here, so the reach
      // beyond it is unproven. Styled apart from a real declaration.
      data-escape={node.escape === true}
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      {/*
        Four a side, and every edge picks the pair that faces the way it goes.

        One source on the right was the left-to-right board's assumption, and it
        outlived it: on a stack running downwards every arrow left the right
        edge, curled under the card and came back to the left edge of the one
        directly below, so a plain sequence looked like a loop. The choice is
        made per edge in `Diagram`, which is the only place that knows where the
        two cards ended up.
      */}
      {POSITIONS.map(([id, position]) => (
        <Handle key={`t-${id}`} id={`t-${id}`} type="target" position={position} />
      ))}
      {POSITIONS.map(([id, position]) => (
        <Handle key={`s-${id}`} id={`s-${id}`} type="source" position={position} />
      ))}

      {collapsible ? (
        <button
          type="button"
          className="fp-dg-collapse"
          aria-label={collapsed ? "Show execution steps" : "Hide execution steps"}
          aria-expanded={!collapsed}
          // A click here toggles the steps and must not also select the card
          // (which opens the code panel).
          onClick={(event) => {
            event.stopPropagation()
            collapse.onToggle(node.id)
          }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      ) : null}

      <span className="fp-dg-type">
        {node.escape === true ? "unproven" : TYPE_LABEL[node.type]}
        {node.changed === true ? (
          <span className="fp-dg-changed" title="This node is part of the change">
            changed
          </span>
        ) : null}
      </span>
      <span className="fp-dg-label">{node.label}</span>
      {node.sublabel === undefined ? null : (
        <span className="fp-dg-sublabel">{node.sublabel}</span>
      )}

      {open && detailed ? (
        <FloatingPortal>
          <div
            className="fp-dg-hover"
            role="tooltip"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <p className="fp-dg-hover-title">{node.label}</p>
            {node.description === undefined ? null : (
              <HostMarkdown className="fp-dg-hover-prose" markdown={node.description} />
            )}
            {code.map((excerpt) => (
              <div className="fp-dg-hover-code" key={`${excerpt.path}:${excerpt.lines}`}>
                <div className="fp-dg-hover-where">
                  <ExcerptLink excerpt={excerpt} />
                </div>
                <CopyAnnotationPath excerpt={excerpt} />
              </div>
            ))}
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  )
}
