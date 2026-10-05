import { createWaypoint, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { descendantsOf, flattenWaypoints, isFileReviewed, isWaypointReviewed } from "@/walkthrough/waypoints"

const file = {
  path: PRICE_PATH,
  title: "Price file",
  summary: [],
  waypoints: [
    createWaypoint("parent", "priceOf", { children: [createWaypoint("first", "format"), createWaypoint("second", "format")] }),
    createWaypoint("sibling", "format"),
  ],
}

describe("flattenWaypoints", () => {
  it("lists the waypoints in reading order with their depth", () => {
    expect(flattenWaypoints(file, priceSource).map((flat) => [flat.waypoint.id, flat.depth])).toStrictEqual([
      ["parent", 0],
      ["first", 1],
      ["second", 1],
      ["sibling", 0],
    ])
  })

  it("gives a waypoint a different fingerprint when its prose or its lines change", () => {
    const [original] = flattenWaypoints(file, priceSource)
    const [reworded] = flattenWaypoints(
      { ...file, waypoints: [createWaypoint("parent", "priceOf", { reading: "Reworded." })] },
      priceSource,
    )
    const [moved] = flattenWaypoints({ ...file, waypoints: [createWaypoint("parent", "format")] }, priceSource)

    expect(reworded.fingerprint).not.toBe(original.fingerprint)
    expect(moved.fingerprint).not.toBe(original.fingerprint)
  })
})

describe("descendantsOf", () => {
  it("returns a waypoint with every waypoint nested in it", () => {
    const flat = flattenWaypoints(file, priceSource)

    expect(descendantsOf(flat, "parent").map((found) => found.waypoint.id)).toStrictEqual(["parent", "first", "second"])
    expect(descendantsOf(flat, "sibling").map((found) => found.waypoint.id)).toStrictEqual(["sibling"])
    expect(descendantsOf(flat, "gone")).toStrictEqual([])
  })
})

describe("isWaypointReviewed and isFileReviewed", () => {
  it("counts a mark only while the fingerprint still matches", () => {
    const [parent] = flattenWaypoints(file, priceSource)

    expect(isWaypointReviewed({ waypoints: { parent: parent.fingerprint }, files: {} }, parent)).toBe(true)
    expect(isWaypointReviewed({ waypoints: { parent: "older" }, files: {} }, parent)).toBe(false)
  })

  it("counts a file as reviewed when every waypoint in it is", () => {
    const flat = flattenWaypoints(file, priceSource)
    const everyWaypoint = Object.fromEntries(flat.map((found) => [found.waypoint.id, found.fingerprint]))

    expect(isFileReviewed({ waypoints: everyWaypoint, files: {} }, PRICE_PATH, flat)).toBe(true)
    expect(isFileReviewed({ waypoints: { parent: flat[0].fingerprint }, files: {} }, PRICE_PATH, flat)).toBe(false)
    expect(isFileReviewed({ waypoints: {}, files: {} }, PRICE_PATH, [])).toBe(false)
  })
})
