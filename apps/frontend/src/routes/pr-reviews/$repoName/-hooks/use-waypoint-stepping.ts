import { useState } from "react"
import { useStepShortcuts } from "@flightplan/ui/lib/use-step-shortcuts"

interface SteppedWaypoint {
  readonly id: string
  readonly anchorId: string
  readonly positionLabel: string
  readonly previousId: string | null
  readonly nextId: string | null
}

type SteppedRow = { readonly kind: "waypoint", readonly waypoint: SteppedWaypoint } | { readonly kind: "lines" | "gap" }

interface SteppedSegment {
  readonly walkthrough: { readonly files: readonly { readonly rows: readonly SteppedRow[] }[] }
}

interface SteppingEnds {
  readonly firstWaypointId: string | null
  readonly lastWaypointId: string | null
}

export interface WaypointStepping {
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly positionLabel: string | null
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onOpenCodeLink: (anchorId: string) => void
}

export const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

export const useWaypointStepping = (segments: readonly SteppedSegment[], ends: SteppingEnds | null): WaypointStepping => {
  const [openWaypointIds, setOpenWaypointIds] = useState<ReadonlySet<string>>(() => new Set())
  const [currentWaypointId, setCurrentWaypointId] = useState<string | null>(null)
  const waypoints = segments.flatMap((segment) =>
    segment.walkthrough.files.flatMap((file) =>
      file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))))
  const currentWaypoint = waypoints.find((waypoint) => waypoint.id === currentWaypointId) ?? null
  const previousWaypointId = currentWaypoint === null ? ends?.lastWaypointId ?? null : currentWaypoint.previousId
  const nextWaypointId = currentWaypoint === null ? ends?.firstWaypointId ?? null : currentWaypoint.nextId

  const visitWaypoint = (waypointId: string | null): void => {
    const waypoint = waypoints.find((candidate) => candidate.id === waypointId)
    if (waypoint === undefined) return
    setCurrentWaypointId(waypoint.id)
    setOpenWaypointIds((openIds) => new Set([...openIds, waypoint.id]))
    scrollToAnchor(waypoint.anchorId)
  }
  const onPrevious = (): void => {
    visitWaypoint(previousWaypointId)
  }
  const onNext = (): void => {
    visitWaypoint(nextWaypointId)
  }

  useStepShortcuts(onPrevious, onNext)

  return {
    openWaypointIds,
    currentWaypointId,
    positionLabel: currentWaypoint?.positionLabel ?? null,
    canStepBack: previousWaypointId !== null,
    canStepForward: nextWaypointId !== null,
    onPrevious,
    onNext,
    onToggleWaypoint: (waypointId) => {
      setCurrentWaypointId(waypointId)
      setOpenWaypointIds((openIds) =>
        new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId]))
    },
    onOpenCodeLink: (anchorId) => {
      const waypoint = waypoints.find((candidate) => candidate.anchorId === anchorId)
      if (waypoint === undefined) scrollToAnchor(anchorId)
      else visitWaypoint(waypoint.id)
    },
  }
}
