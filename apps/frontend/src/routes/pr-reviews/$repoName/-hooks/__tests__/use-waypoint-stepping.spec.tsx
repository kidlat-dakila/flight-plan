import { act, render, renderHook, waitFor } from "@testing-library/react"
import { jumpToSettledAnchor, type SteppedSegment, type SteppedWaypoint, useWaypointStepping } from "@/routes/pr-reviews/$repoName/-hooks/use-waypoint-stepping"

const OPENED_FILE_ID = "file-2"

const waypointOf = (id: string): SteppedWaypoint => ({ id, anchorId: `${id}-anchor`, positionLabel: id, previousId: null, nextId: null })

const SEGMENTS: readonly SteppedSegment[] = [
  {
    walkthrough: {
      anchorId: "walkthrough",
      files: [
        { anchorId: "file-1", rows: [{ kind: "waypoint", waypoint: waypointOf("waypoint-1") }] },
        {
          anchorId: OPENED_FILE_ID,
          rows: [
            { kind: "lines" },
            { kind: "waypoint", waypoint: waypointOf("waypoint-2") },
            { kind: "waypoint", waypoint: waypointOf("waypoint-3") },
          ],
        },
      ],
    },
  },
]

describe("useWaypointStepping", () => {
  it("makes the first waypoint of an entered file current without focusing it", () => {
    const stepping = renderHook(() => useWaypointStepping(SEGMENTS)).result.current

    act(() => {
      stepping.onFileEntered(OPENED_FILE_ID)
    })

    expect(stepping.store.getState()).toMatchObject({ currentWaypointId: "waypoint-2", focusedWaypointId: null, visit: null, holdingAnchorId: OPENED_FILE_ID })
  })
})

describe("jumpToSettledAnchor", () => {
  const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions) => void>()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Reflect.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView })
    render(<div id={OPENED_FILE_ID} />)
  })

  it("jumps without a smooth scroll", async () => {
    jumpToSettledAnchor(OPENED_FILE_ID, vi.fn())

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled()
    })
    expect(scrollIntoView.mock.calls.every(([options]) => options?.behavior === "instant")).toBe(true)
  })

  it("reports once the anchor stops moving", async () => {
    const onSettled = vi.fn()

    jumpToSettledAnchor(OPENED_FILE_ID, onSettled)

    await waitFor(() => {
      expect(onSettled).toHaveBeenCalledOnce()
    })
  })
})
