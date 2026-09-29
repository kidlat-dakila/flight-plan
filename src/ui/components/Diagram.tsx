import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react"
import { useSelectedIndex } from "codehike/utils/selection"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  CardCollapse,
  CardSelection,
  DiagramNodeCard,
  type CardData,
} from "./DiagramNodeCard"
import { VscodeIcon } from "../vscode"
import { bounds, layout, type Bounds } from "../diagram/layout"
import { collapsibleIds, visibleDiagram } from "../diagram/collapse"
import { FullScreenButton, useMaximisedBoard } from "./maximise"
import type {
  Diagram as DiagramIR,
  DiagramNode,
  DiagramProblem,
  EdgeKind,
} from "../../lib/schemas/diagram/schema"

/** One of the four sides of a card, named as the handles are. */
type Side = "top" | "right" | "bottom" | "left"

/** What the layout gives back for one card, and all this needs of it. */
type Placement = { x: number; y: number; width: number; height: number }

/**
 * Which side of each card an edge should leave and arrive on.
 *
 * The edge's own kind decides the axis, because the layout used the same fact
 * to place the two cards: a `child` is directly below its parent, so the edge
 * leaves the bottom and arrives at the top, and a `call` is a column across, so
 * it leaves the side facing it. Reading the axis back out of the coordinates
 * was the earlier attempt and it could not tell the two apart — the far arm of
 * a fork is further across than it is down, and a call that returns to a
 * shallower column is further down than it is across.
 *
 * The coordinates still decide the *direction* along that axis, which is what
 * makes a return read as a return: an edge back to a card on the left leaves
 * the left side, and one to a card above leaves the top.
 */
export function sidesFor(
  kind: EdgeKind,
  from: Placement | undefined,
  to: Placement | undefined,
): { source: Side; target: Side } {
  if (from === undefined || to === undefined) {
    return kind === "child"
      ? { source: "bottom", target: "top" }
      : { source: "right", target: "left" }
  }
  if (kind === "child") {
    return to.y + to.height / 2 >= from.y + from.height / 2
      ? { source: "bottom", target: "top" }
      : { source: "top", target: "bottom" }
  }
  return to.x + to.width / 2 >= from.x + from.width / 2
    ? { source: "right", target: "left" }
    : { source: "left", target: "right" }
}

/**
 * The zoom below which a board is a picture of boxes rather than a diagram.
 *
 * Measured, not chosen: a card's sublabel is 11px, so a little over half size
 * is where the second line stops being a word.
 */
const READABLE_ZOOM = 0.55

/**
 * Fits the board, or frames the top of it when fitting would not be readable.
 *
 * A call stack drawn with its execution steps is tall — the sample runs to
 * twenty-three cards over three thousand pixels — and fitting answers that by
 * zooming to about a tenth, where every card is a grey rectangle. Below
 * `READABLE_ZOOM` this puts the entry point at the top of the board instead, at
 * a zoom a reader can read, and they follow the stack down, which is the
 * direction it is drawn in.
 *
 * It replaces React Flow's own `fitView` prop rather than correcting it. Both
 * run on mount and on every resize of the board, and the built-in one ran second
 * and won: the board settled at the minimum zoom a frame after this had framed
 * it. One of the two has to own the viewport.
 *
 * React Flow's pane size comes from the store because it is measured there,
 * which is also what makes this agree with what fitting would have done.
 */
function Frame({ box }: { box: Bounds }) {
  const flow = useReactFlow()
  const width = useStore((state) => state.width)
  const height = useStore((state) => state.height)
  useEffect(() => {
    if (width === 0 || height === 0) return
    const margin = 24
    const fitted = Math.min(
      (width - margin * 2) / box.width,
      (height - margin * 2) / box.height,
    )
    if (fitted >= READABLE_ZOOM) {
      void flow.fitView({ padding: 0.1 })
      return
    }
    const zoom = READABLE_ZOOM
    flow.setViewport({
      x: width / 2 - (box.x + box.width / 2) * zoom,
      y: margin - box.y * zoom,
      zoom,
    })
  }, [flow, box, width, height])
  return null
}

/**
 * Brings the diagram back into view without changing the zoom.
 *
 * This replaced React Flow's fit-view button rather than sitting beside it.
 * Fit-view zooms out until everything is on screen, which on a wide diagram
 * means the cards become unreadable — and its corner-bracket icon read as a
 * second full-screen button, which is why that icon now belongs to the real
 * one. This keeps whatever zoom the reader chose and only moves the viewport,
 * which is what someone who has panned off the edge of a large board wants.
 *
 * Inside `Controls`, so it inherits that toolbar's styling and sits with the
 * other buttons. `useReactFlow` works here because the toolbar renders within
 * the `ReactFlow` subtree.
 */
function RecentreButton({ box }: { box: Bounds }) {
  const flow = useReactFlow()
  return (
    <ControlButton
      // React Flow's own buttons are unlabelled SVGs, so the label is the
      // tooltip and the accessible name both.
      title="Centre the diagram"
      aria-label="Centre the diagram"
      onClick={() => {
        flow.setCenter(box.x + box.width / 2, box.y + box.height / 2, {
          // The current zoom, explicitly: `setCenter` jumps to `maxZoom`
          // without it, which would make this a second fit-view button with a
          // worse name.
          zoom: flow.getZoom(),
          // No `duration`. An animated `setCenter` is silently dropped here —
          // the handler runs, the viewport does not move, and nothing reports
          // it, which took a while to find. Instant is also the better
          // behaviour for a button whose whole job is "put it back".
        })
      }}
    >
      <VscodeIcon name="target" size={12} />
    </ControlButton>
  )
}

/**
 * The diagram board.
 *
 * React Flow, because the requirement was pan on drag and zoom on scroll with
 * rich nodes, and it is the one library that does both without the nodes being
 * a fight: a custom node is a React component. It is MIT, pure JavaScript, and
 * contains no `WebAssembly`, `fetch`, `Worker` or `eval`, which matters because
 * the panel's policy is `default-src 'none'` with a nonce.
 *
 * **The binding is the point.** A standalone diagram has no notion of a
 * waypoint; this one lives inside Code Hike's `SelectionProvider`, so selecting
 * a waypoint lights up the nodes that explain it and clicking a node selects its
 * waypoint. The diagram is the map and the waypoints are the tour, which is the
 * same relationship the code panel already has with the prose column, applied to
 * a second medium.
 */

/** Excerpts prepared by the host, keyed by node id. */
export type DiagramExcerpts = Record<string, DiagramExcerpt[]>

export type DiagramExcerpt = {
  path: string
  /** The range as a label, for example `L37-45`, or "" for a whole file. */
  lines: string
  /**
   * The range itself, after any anchor repair.
   *
   * Kept as numbers beside the label because the copy button builds a
   * reference from them. Repaired on the host side, which is the only place
   * that can read the file — the card no longer renders the code, but the
   * range it names still has to be the range the code is at now.
   */
  from?: number
  to?: number
  /** Repository and commit, when the reference has to be qualified. */
  at?: { repo: string; sha: string } | null
  /**
   * Where the reader goes to see these lines in context.
   *
   * The same two kinds a waypoint's open button has, and for the same reason:
   * the editor when the file on disk is the file this was read from, a link
   * otherwise. It used to be a diff href alone, which meant **most nodes had
   * no link at all** — a diff anchor exists only for files the pull request
   * changes, and a diagram is a call stack, so most of its nodes are context
   * the change never touches.
   */
  open?:
    | { kind: "editor"; path: string; line: number }
    | { kind: "link"; href: string; label: string }
    | null
}

export type DiagramProps = {
  diagram: DiagramIR | null
  problems: readonly DiagramProblem[]
  excerpts: DiagramExcerpts
  /**
   * Selection index of each node's own code panel.
   *
   * Empty when the host prepared none, which leaves a node with no panel
   * unclickable rather than clickable and inert.
   */
  panels?: ReadonlyMap<string, number>
}

const nodeTypes = { card: DiagramNodeCard }

/** Stable, so an absent `panels` does not rebuild every node on each render. */
const EMPTY_PANELS: ReadonlyMap<string, number> = new Map()

/**
 * What a click on this node would do, or nothing.
 *
 * One decision, in one place. A node is clickable when the host prepared a code
 * panel for it, and clicking shows that panel. A node with no panel is inert,
 * and correctly: there is nowhere for it to take you.
 */
export function actionFor(
  node: DiagramNode,
  panels: ReadonlyMap<string, number>,
): { panel: number } | null {
  const panel = panels.get(node.id)
  return panel === undefined ? null : { panel }
}

export function Diagram({
  diagram,
  problems,
  excerpts,
  panels,
}: DiagramProps) {
  const [, select] = useSelectedIndex()
  /** The card the reader last clicked, so it stays lit. */
  const [clicked, setClicked] = useState<string | null>(null)

  /** The ids that have execution steps beneath them, so they can collapse. */
  const collapsible = useMemo(
    () => (diagram === null ? new Set<string>() : collapsibleIds(diagram)),
    [diagram],
  )

  /*
   * Which cards have their steps hidden. Every collapsible card starts
   * collapsed, so a board opens as the call chain — one card per function —
   * and a reader expands the ones whose logic they want to read. Reset when the
   * board changes; the choice is a reading aid, not part of the document.
   */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(collapsible)
  useEffect(() => {
    setCollapsed(collapsible)
  }, [collapsible])

  const onToggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const collapseValue = useMemo(
    () => ({ collapsible, collapsed, onToggle }),
    [collapsible, collapsed, onToggle],
  )

  // The board actually drawn: the steps under collapsed cards removed. The call
  // chain is untouched — collapse follows child edges only.
  const visible = useMemo<DiagramIR | null>(
    () => (diagram === null ? null : visibleDiagram(diagram, collapsed)),
    [diagram, collapsed],
  )

  const placed = useMemo(
    () => (visible === null ? new Map() : layout(visible)),
    [visible],
  )

  // The diagram's extent, for the recentre button. From the layout, so it is
  // known before anything is drawn.
  const box = useMemo(() => bounds(placed), [placed])

  /*
   * Whether the code panel is over the board, which starts as no.
   *
   * Somebody who maximises a diagram is asking to see the map. The panel used
   * to be there on arrival, forty-four percent of the screen wide, showing
   * whichever waypoint happened to be selected before — code with no relation
   * to the thing they had just maximised, covering the thing they had
   * maximised it to look at. Now a card has to be clicked for it, which is
   * also the only gesture in full screen that means "show me this".
   *
   * Reset on every entry rather than remembered, because the question is asked
   * again each time and the honest answer is the same each time.
   */
  const [codeOpen, setCodeOpen] = useState(false)

  /*
   * Escape closes the code panel before it leaves the board.
   *
   * One thing at a time, and the panel is the thing most recently asked for.
   */
  const onEscape = useCallback(() => {
    if (!codeOpen) return false
    setCodeOpen(false)
    return true
  }, [codeOpen])

  const { full, setFull, figureRef, layer } = useMaximisedBoard({
    layerClass: "fp-dg-layer",
    onEscape,
  })

  useEffect(() => {
    setCodeOpen(false)
  }, [full])

  // The panel's own state, on the root the stylesheet reads.
  useEffect(() => {
    const root = figureRef.current?.closest<HTMLElement>(".fp-root")
    if (root === null || root === undefined || !full) return
    root.dataset["fpDiagramCode"] = codeOpen ? "open" : "closed"
    return () => {
      delete root.dataset["fpDiagramCode"]
    }
  }, [full, codeOpen, figureRef])

  /*
   * The node array, deliberately free of anything to do with selection.
   *
   * React Flow reads `measured` off the object it is handed and keeps the old
   * measurements only when that object is the same identity. Selection used to
   * be part of each node's `data`, so every selection change built a new array
   * of new objects, React Flow discarded every measurement, and a node with no
   * measurements renders `visibility: hidden`. Scrolling changes the selection
   * at every waypoint boundary, so a reader who scrolled down and back found
   * the board empty. Which card is lit travels by context now, and this array
   * changes only when the graph does.
   */
  const nodes = useMemo<Node[]>(() => {
    if (visible === null) return []
    return visible.nodes.map((node) => {
      const at = placed.get(node.id)
      const code = excerpts[node.id] ?? []
      const data: CardData = {
        node,
        code,
        clickable: actionFor(node, panels ?? EMPTY_PANELS) !== null,
      }
      return {
        id: node.id,
        type: "card",
        position: { x: at?.x ?? 0, y: at?.y ?? 0 },
        data: data as unknown as Record<string, unknown>,
        // Dragging a node would imply the position is saved, and it is not:
        // the pipeline emits no placement and every node is laid out
        // automatically.
        draggable: false,
        selectable: data.clickable,
      }
    })
  }, [visible, placed, excerpts, panels])

  const edges = useMemo<Edge[]>(() => {
    if (visible === null) return []
    return visible.edges.map((edge, index) => {
      const sides = sidesFor(edge.kind, placed.get(edge.source), placed.get(edge.target))
      return {
        id: `${edge.source}->${edge.target}-${String(index)}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: `s-${sides.source}`,
        targetHandle: `t-${sides.target}`,
        label: edge.label ?? (edge.kind === "value" ? "handoff" : undefined),
        className: `fp-dg-edge fp-dg-edge-${edge.variant ?? "default"} fp-dg-edge-kind-${edge.kind}`,
        animated: edge.variant === "emphasis",
        // A handoff is not a plain call: the function travelled as a value and
        // was fired at the far end, so it is drawn dashed.
        ...(edge.kind === "value" ? { style: { strokeDasharray: "6 4" } } : {}),
      }
    })
  }, [visible, placed])

  /*
   * Something is active only when a card has been clicked and is still on the
   * board. Dimming everything otherwise would make the diagram look broken.
   */
  // Above the early return below, and it has to be: a hook called after a
  // conditional return is called in a different order on the next render, and
  // this component returns early for a diagram that could not be parsed.
  const selection = useMemo(
    () => ({
      clicked,
      anyActive: (diagram?.nodes ?? []).some((node) => node.id === clicked),
    }),
    [diagram, clicked],
  )

  if (diagram === null) {
    return (
      <div className="fp-dg-broken">
        <p>This diagram could not be read.</p>
        <ul>
          {problems.map((problem) => (
            <li key={problem.message}>{problem.message}</li>
          ))}
        </ul>
      </div>
    )
  }

  /*
   * The board, built once and rendered in one of two places.
   *
   * Remounted rather than moved when it goes full screen, which a portal to a
   * different parent does anyway — and that is wanted here: `fitView` runs on
   * init, so the new mount fits itself to the new size. Re-fitting an existing
   * board from an effect fitted it against the size it had a frame earlier and
   * left the cards in a thin strip at the top left.
   */
  const board = (
    <CardSelection.Provider value={selection}>
      <CardCollapse.Provider value={collapseValue}>
        <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // No `fitView` prop. `Frame` below owns the viewport, for the reason
        // written there.
        //
        // Rich cards get large; letting the reader zoom out further than the
        // default keeps a wide diagram usable.
        minZoom={0.2}
        maxZoom={2}
        onPaneClick={() => {
          // A click on the bare board means "put the map back".
          setCodeOpen(false)
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_event, node) => {
          const card = node.data as unknown as CardData
          const action = actionFor(card.node, panels ?? EMPTY_PANELS)
          if (action === null) return
          /*
           * A click on a card asks to see the map, so the first one takes the
           * board over the panel.
           *
           * The selection below still happens, so nothing is lost by it: the
           * card lights up whether or not this click was the one that maximised.
           * What it does *not* do is open the code panel on the way in — `full`
           * is still false here, so the line below leaves it shut, which is the
           * whole point of arriving at a map.
           */
          if (!full) setFull(true)
          setClicked(node.id)
          // In full screen a click is the only way to ask for code, so it is
          // also what opens the panel. Outside it the panel is always there.
          if (full) setCodeOpen(true)
          // The node's own panel, so every card shows its title, subtitle and
          // description.
          select(action.panel)
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        {box === null ? null : <Frame box={box} />}
        {/*
          No fit-view button. Zoom in, zoom out, centre, full screen — four is
          already a lot for a figure, and fit-view was the one whose result a
          reader could not predict.
        */}
        <Controls showInteractive={false} showFitView={false}>
          {box === null ? null : <RecentreButton box={box} />}
          <FullScreenButton
            full={full}
            onToggle={() => {
              setFull(!full)
            }}
          />
        </Controls>
        </ReactFlow>
      </CardCollapse.Provider>
    </CardSelection.Provider>
  )

  return (
    <figure className="fp-dg" ref={figureRef}>
      {diagram.title === undefined ? null : (
        <figcaption className="fp-dg-title">{diagram.title}</figcaption>
      )}
      {/*
        Empty while the board is on the full-screen layer. Nothing renders a
        placeholder here, because the reading column is hidden in full screen
        and a message nobody can see is worse than a gap nobody can see.
      */}
      {/*
        Taller for a taller graph, up to a point.

        The height is a floor and a ceiling with the graph in between: a
        four-node board should not be a window of empty dots, and a
        twenty-three-node one should not push the waypoints it accompanies off
        the screen. Past the ceiling the board frames the top of the stack and
        the reader pans, or opens it full screen.
      */}
      <div
        className="fp-dg-board"
        style={
          box === null
            ? undefined
            : { height: `clamp(22rem, ${String(Math.round(box.height + 48))}px, 40rem)` }
        }
      >
        {layer === null ? board : null}
      </div>
      {layer === null
        ? null
        : createPortal(<div className="fp-dg-board">{board}</div>, layer)}
      {problems.length === 0 ? null : (
        <ul className="fp-dg-warnings">
          {problems.map((problem) => (
            <li key={problem.message}>{problem.message}</li>
          ))}
        </ul>
      )}
    </figure>
  )
}
