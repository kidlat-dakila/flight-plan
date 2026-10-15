import { planWalkthroughEdit } from "@/procedures/edit-walkthrough/utils/plan-walkthrough-edit"
import { CART_PATH, createArtifact, createSegment, createWaypoint, PRICE_PATH } from "@/procedures/get-review/utils/__tests__/review-fixture"

const nested = createSegment({
  id: "nested",
  walkthrough: {
    files: [
      {
        path: PRICE_PATH,
        waypoints: [createWaypoint("price-of", "priceOf", { children: [createWaypoint("format", "format")] })],
      },
      { path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] },
    ],
  },
})

const artifact = createArtifact({ segments: [createSegment({ id: "flat" }), nested] })

const filesOf = (planned: ReturnType<typeof planWalkthroughEdit>, segmentId: string) =>
  planned.kind === "planned" ? planned.artifact.segments.find((segment) => segment.id === segmentId)?.walkthrough.files ?? null : null

const pathsOf = (planned: ReturnType<typeof planWalkthroughEdit>, segmentId: string): unknown =>
  filesOf(planned, segmentId)?.map((file) => file.path) ?? null

describe("planWalkthroughEdit", () => {
  it("moves a file one place in the walkthrough of its segment and leaves the other segments as they were", () => {
    const planned = planWalkthroughEdit(artifact, "flat", { kind: "move-file", path: CART_PATH, direction: "up" })

    expect(pathsOf(planned, "flat")).toStrictEqual([CART_PATH, PRICE_PATH])
    expect(pathsOf(planned, "nested")).toStrictEqual([PRICE_PATH, CART_PATH])
  })

  it("rejects a move past the first or the last file", () => {
    expect(planWalkthroughEdit(artifact, "flat", { kind: "move-file", path: PRICE_PATH, direction: "up" })).toStrictEqual({
      kind: "rejected",
      message: "This file is already the first.",
    })
    expect(planWalkthroughEdit(artifact, "flat", { kind: "move-file", path: CART_PATH, direction: "down" })).toStrictEqual({
      kind: "rejected",
      message: "This file is already the last.",
    })
  })

  it("removes a file from the walkthrough and keeps it among the files of the segment", () => {
    const planned = planWalkthroughEdit(artifact, "flat", { kind: "remove-file", path: PRICE_PATH })

    expect(pathsOf(planned, "flat")).toStrictEqual([CART_PATH])
    expect(planned).toMatchObject({ artifact: { segments: [{ changedPaths: [PRICE_PATH, CART_PATH] }, {}] } })
  })

  it("rejects a file the walkthrough does not hold", () => {
    expect(planWalkthroughEdit(artifact, "flat", { kind: "remove-file", path: "src/gone.ts" })).toStrictEqual({
      kind: "rejected",
      message: "This file is no longer in the Code Walkthrough.",
    })
  })

  it("writes the trimmed title, reading and attention reason of a waypoint, also one inside another, and keeps the rest of it", () => {
    const planned = planWalkthroughEdit(artifact, "nested", {
      kind: "change-waypoint",
      waypointId: "format",
      title: "  Formats in cents ",
      reading: " Reads [`priceOf`](code:src/price.ts#priceOf).\n",
      needsAttention: " Rounds down. ",
    })

    expect(filesOf(planned, "nested")?.[0].waypoints).toStrictEqual([
      createWaypoint("price-of", "priceOf", {
        children: [
          createWaypoint("format", "format", {
            title: "Formats in cents",
            reading: "Reads [`priceOf`](code:src/price.ts#priceOf).",
            needsAttention: "Rounds down.",
          }),
        ],
      }),
    ])
  })

  it("takes the attention mark off a waypoint", () => {
    const marked = createArtifact({
      segments: [
        createSegment({
          walkthrough: {
            files: [{ path: PRICE_PATH, waypoints: [createWaypoint("price-of", "priceOf", { needsAttention: "Look." })] }],
          },
        }),
      ],
    })

    const planned = planWalkthroughEdit(marked, "all", { kind: "change-waypoint", waypointId: "price-of", title: "Price", reading: "", needsAttention: null })

    expect(filesOf(planned, "all")?.[0].waypoints).toMatchObject([{ title: "Price", reading: "", needsAttention: null }])
  })

  it("marks a waypoint as needing attention with no reason", () => {
    const planned = planWalkthroughEdit(artifact, "flat", { kind: "change-waypoint", waypointId: "subtotal", title: "Sums", reading: "Adds up.", needsAttention: " \n" })

    expect(filesOf(planned, "flat")?.[1].waypoints).toMatchObject([{ needsAttention: "" }])
  })

  it("rejects a waypoint with no title and a code link the artifact does not hold", () => {
    const change = { kind: "change-waypoint" as const, waypointId: "subtotal", title: "Sums", reading: "Adds up.", needsAttention: null }

    expect(planWalkthroughEdit(artifact, "flat", { ...change, title: " " })).toStrictEqual({
      kind: "rejected",
      message: "Write the title. A waypoint cannot be without one.",
    })
    expect(planWalkthroughEdit(artifact, "flat", { ...change, reading: "See [`gone`](code:src/gone.ts#gone)." })).toStrictEqual({
      kind: "rejected",
      message: "This code link points at code the Flight Plan does not hold: src/gone.ts#gone.",
    })
  })

  it("removes a waypoint and keeps the waypoints inside it in its place", () => {
    const planned = planWalkthroughEdit(artifact, "nested", { kind: "remove-waypoint", waypointId: "price-of" })

    expect(filesOf(planned, "nested")?.[0].waypoints).toStrictEqual([createWaypoint("format", "format")])
  })

  it("rejects a waypoint or a segment that is gone", () => {
    expect(planWalkthroughEdit(artifact, "flat", { kind: "remove-waypoint", waypointId: "gone" })).toStrictEqual({
      kind: "rejected",
      message: "This waypoint is no longer in the Code Walkthrough.",
    })
    expect(planWalkthroughEdit(artifact, "gone", { kind: "remove-waypoint", waypointId: "subtotal" })).toStrictEqual({
      kind: "rejected",
      message: "This segment is no longer in the Flight Plan.",
    })
  })
})
