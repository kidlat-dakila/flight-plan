import { DRAFT_SEGMENT, messageOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { amendWaypoints } from "@/procedures/update-nodes/utils/amend-waypoints"

const idsInFile = (outcome: ReturnType<typeof amendWaypoints>, fileIndex: number): string[] =>
  outcome.kind === "amended" ? (outcome.segments[0]?.walkthrough.files[fileIndex]?.waypoints ?? []).map((waypoint) => waypoint.id) : []

const NESTED_SEGMENT = {
  ...DRAFT_SEGMENT,
  walkthrough: {
    ...DRAFT_SEGMENT.walkthrough,
    files: DRAFT_SEGMENT.walkthrough.files.map((file) => ({
      ...file,
      waypoints: file.waypoints.map((waypoint) =>
        waypoint.id === "w3"
          ? { ...waypoint, children: [{ ...waypoint, id: "w3a" }, { ...waypoint, id: "w3b" }] }
          : waypoint),
    })),
  },
}

describe("amendWaypoints", () => {
  it("keeps what an edit does not name, and takes a core-change note back with null", () => {
    const flagged = amendWaypoints([DRAFT_SEGMENT], [{ id: "w1", title: "Returned zero", coreChange: "Read this." }])
    const flaggedSegments = flagged.kind === "amended" ? flagged.segments : []

    const cleared = amendWaypoints(flaggedSegments, [{ id: "w1", coreChange: null }])

    expect(flagged).toMatchObject({ segments: [{ walkthrough: { files: [{ waypoints: [{ coreChange: "Read this." }] }, {}] } }] })
    expect(cleared).toMatchObject({
      kind: "amended",
      segments: [{ walkthrough: { files: [{ waypoints: [{ id: "w1", title: "Returned zero", reading: "", coreChange: null }] }, {}] } }],
    })
  })

  it("writes a nested waypoint by its id", () => {
    const outcome = amendWaypoints([NESTED_SEGMENT], [{ id: "w3b", title: "Rounded the sum" }])

    expect(outcome).toMatchObject({
      kind: "amended",
      segments: [{ walkthrough: { files: [{}, { waypoints: [{ id: "w2" }, { id: "w3", title: null, children: [{ id: "w3a", title: null }, { id: "w3b", title: "Rounded the sum" }] }] }] } }],
    })
  })

  it("moves a top-level waypoint to its position and shifts the others", () => {
    expect(idsInFile(amendWaypoints([DRAFT_SEGMENT], [{ id: "w3", position: 1 }]), 1)).toStrictEqual(["w3", "w2"])
  })

  it("refuses a position past the end of the file", () => {
    expect(amendWaypoints([DRAFT_SEGMENT], [{ id: "w3", position: 3 }])).toStrictEqual({
      kind: "refused",
      message: "`w3` cannot go to position 3: `src/cart/subtotal.ts` has 2 top-level waypoints. Nothing was written.",
    })
  })

  it("refuses one position given to two waypoints of a file", () => {
    expect(messageOf(amendWaypoints([DRAFT_SEGMENT], [{ id: "w2", position: 1 }, { id: "w3", position: 1 }]))).toContain("Two waypoints were given position 1")
  })

  it("refuses a position on a nested waypoint", () => {
    expect(messageOf(amendWaypoints([NESTED_SEGMENT], [{ id: "w3a", position: 2 }]))).toContain("only a file's top-level waypoints can be reordered")
  })

  it("refuses a question that carries a solution", () => {
    const question = { id: "f-why", kind: "question" as const, title: "Why zero?", reading: "Is zero a price?", solution: "  return null" }

    expect(messageOf(amendWaypoints([DRAFT_SEGMENT], [{ id: "w1", findings: [question] }]))).toContain("A question carries no trace and no solution: `f-why`.")
  })

  it("refuses a waypoint named twice in one call", () => {
    expect(messageOf(amendWaypoints([DRAFT_SEGMENT], [{ id: "w1", title: "One" }, { id: "w1", title: "Two" }]))).toContain("names the waypoint `w1` more than once")
  })
})
