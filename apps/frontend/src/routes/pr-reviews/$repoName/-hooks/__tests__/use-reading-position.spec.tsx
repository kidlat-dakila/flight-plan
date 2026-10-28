import { act, render, renderHook, waitFor } from "@testing-library/react"
import { holdCurrentAnchorId, useReadingPositionStore } from "@/routes/pr-reviews/$repoName/-hooks/use-reading-position"

const SECTION_IDS = ["context", "walkthrough", "file-1"]
const WAYPOINT_IDS = ["waypoint-1", "waypoint-2"]
const ANCHOR_HEIGHT = 40

const placeAnchors = (topsByAnchorId: Readonly<Record<string, number>>): void => {
  const tops = new Map(Object.entries(topsByAnchorId))
  Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      return DOMRect.fromRect({ y: tops.get(this.id) ?? 0, height: ANCHOR_HEIGHT })
    },
  })
}

const scroll = (topsByAnchorId: Readonly<Record<string, number>>): void => {
  placeAnchors(topsByAnchorId)
  act(() => {
    window.dispatchEvent(new Event("scroll"))
  })
}

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })
}

const renderStore = () => renderHook(() => useReadingPositionStore(SECTION_IDS, WAYPOINT_IDS)).result.current

describe("useReadingPositionStore", () => {
  beforeEach(() => {
    render(<>{[...SECTION_IDS, ...WAYPOINT_IDS].map((anchorId) => <div key={anchorId} id={anchorId} />)}</>)
  })

  it("names the last section past the reading line and the waypoints above it", () => {
    placeAnchors({ "context": -500, "walkthrough": 100, "file-1": 600, "waypoint-1": 50, "waypoint-2": 700 })

    const store = renderStore()

    expect(store.getState().currentAnchorId).toBe("walkthrough")
    expect([...store.getState().aboveAnchorIds]).toStrictEqual(["waypoint-1"])
  })

  it("names the first section before any section reaches the reading line", () => {
    placeAnchors({ "context": 300, "walkthrough": 900, "file-1": 1500, "waypoint-1": 1000, "waypoint-2": 1600 })

    expect(renderStore().getState().currentAnchorId).toBe("context")
  })

  it("keeps its position while a scroll moves nothing across the reading line", async () => {
    placeAnchors({ "context": -500, "walkthrough": 100, "file-1": 600, "waypoint-1": 50, "waypoint-2": 700 })
    const store = renderStore()
    const before = store.getState()
    const onChange = vi.fn()
    store.subscribe(onChange)

    scroll({ "context": -520, "walkthrough": 80, "file-1": 580, "waypoint-1": 30, "waypoint-2": 680 })
    await nextFrame()

    expect(store.getState()).toBe(before)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("moves on once a scroll carries a section and a waypoint past the reading line", async () => {
    placeAnchors({ "context": -500, "walkthrough": 100, "file-1": 600, "waypoint-1": 50, "waypoint-2": 700 })
    const store = renderStore()

    scroll({ "context": -1100, "walkthrough": -500, "file-1": 0, "waypoint-1": -550, "waypoint-2": 100 })

    await waitFor(() => {
      expect(store.getState().currentAnchorId).toBe("file-1")
    })
    expect([...store.getState().aboveAnchorIds]).toStrictEqual(["waypoint-1", "waypoint-2"])
  })

  it("holds an opened section as current until the next scroll", async () => {
    placeAnchors({ "context": -1100, "walkthrough": -500, "file-1": 300, "waypoint-1": -550, "waypoint-2": 400 })
    const store = renderStore()

    holdCurrentAnchorId(store, "file-1")

    expect(store.getState().currentAnchorId).toBe("file-1")
    scroll({ "context": -1000, "walkthrough": -400, "file-1": 400, "waypoint-1": -450, "waypoint-2": 500 })
    await waitFor(() => {
      expect(store.getState().currentAnchorId).toBe("walkthrough")
    })
  })
})
