import { useEffect, useRef, useState } from "react"
import { useStore } from "zustand"
import { createStore, type StoreApi } from "zustand/vanilla"

export interface ReadingPosition {
  readonly currentAnchorId: string | null
  readonly aboveAnchorIds: ReadonlySet<string>
}

export type ReadingPositionStore = StoreApi<ReadingPosition>

interface TrackedAnchors {
  readonly sectionAnchorIds: readonly string[]
  readonly waypointAnchorIds: readonly string[]
}

const SECTION_READING_LINE_PX = 140
const WAYPOINT_READING_LINE_PX = 120
const NO_FRAME = 0
const ANCHOR_SEPARATOR = "\n"
const START_POSITION: ReadingPosition = { currentAnchorId: null, aboveAnchorIds: new Set() }

const anchorIdsOf = (anchorKey: string): readonly string[] => (anchorKey === "" ? [] : anchorKey.split(ANCHOR_SEPARATOR))

const sectionAtReadingLine = (anchorIds: readonly string[]): string | null =>
  anchorIds.reduce<string | null>((currentAnchorId, anchorId) => {
    const element = document.getElementById(anchorId)
    return element !== null && element.getBoundingClientRect().top <= SECTION_READING_LINE_PX ? anchorId : currentAnchorId
  }, anchorIds.at(0) ?? null)

const isAboveReadingLine = (anchorId: string): boolean => {
  const rect = document.getElementById(anchorId)?.getBoundingClientRect()
  return rect !== undefined && rect.height > 0 && rect.top < WAYPOINT_READING_LINE_PX
}

const measuredPositionOf = (tracked: TrackedAnchors): ReadingPosition => ({
  currentAnchorId: sectionAtReadingLine(tracked.sectionAnchorIds),
  aboveAnchorIds: new Set(tracked.waypointAnchorIds.filter(isAboveReadingLine)),
})

const isSameSet = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean =>
  left.size === right.size && [...left].every((anchorId) => right.has(anchorId))

const isSamePosition = (left: ReadingPosition, right: ReadingPosition): boolean =>
  left.currentAnchorId === right.currentAnchorId && isSameSet(left.aboveAnchorIds, right.aboveAnchorIds)

export const useReadingPositionStore = (sectionAnchorIds: readonly string[], waypointAnchorIds: readonly string[]): ReadingPositionStore => {
  const [store] = useState(() => createStore<ReadingPosition>(() => START_POSITION))
  const frameRef = useRef(NO_FRAME)
  const sectionKey = sectionAnchorIds.join(ANCHOR_SEPARATOR)
  const waypointKey = waypointAnchorIds.join(ANCHOR_SEPARATOR)

  useEffect(() => {
    const tracked = { sectionAnchorIds: anchorIdsOf(sectionKey), waypointAnchorIds: anchorIdsOf(waypointKey) }
    const measure = (): void => {
      frameRef.current = NO_FRAME
      const measured = measuredPositionOf(tracked)
      if (!isSamePosition(store.getState(), measured)) store.setState(measured, true)
    }
    const scheduleMeasure = (): void => {
      if (frameRef.current === NO_FRAME) frameRef.current = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener("scroll", scheduleMeasure, { passive: true })
    window.addEventListener("resize", scheduleMeasure)
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = NO_FRAME
      window.removeEventListener("scroll", scheduleMeasure)
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [store, sectionKey, waypointKey])

  return store
}

export const useReadingPosition = (store: ReadingPositionStore): ReadingPosition => useStore(store)

export const useCurrentAnchorId = (store: ReadingPositionStore): string | null => useStore(store, (position) => position.currentAnchorId)
