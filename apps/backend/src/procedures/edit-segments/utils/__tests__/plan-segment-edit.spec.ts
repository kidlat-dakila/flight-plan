import { planSegmentEdit, type PlannedSegmentEdit } from "@/procedures/edit-segments/utils/plan-segment-edit"
import { CART_PATH, createArtifact, createSegment, PRICE_PATH } from "@/procedures/get-review/utils/__tests__/review-fixture"
import type { ReviewArtifact } from "@flightplan/configurations"

const NEW_SEGMENT_ID = "new"

const artifact = createArtifact({
  isSegmented: true,
  segments: [
    createSegment({ id: "stock", title: "Stock", changedPaths: [CART_PATH, PRICE_PATH] }),
    createSegment({ id: "cart", title: "Cart", changedPaths: [CART_PATH] }),
    createSegment({ id: "price", title: "Price", changedPaths: [PRICE_PATH] }),
  ],
})

const artifactOf = (planned: PlannedSegmentEdit): ReviewArtifact | null => (planned.kind === "planned" ? planned.artifact : null)

const segmentIdsOf = (planned: PlannedSegmentEdit): readonly string[] | null =>
  artifactOf(planned)?.segments.map((segment) => segment.id) ?? null

describe("planSegmentEdit", () => {
  it("changes the label and the files of the named segment alone, and drops the File Section of a file it lost", () => {
    const planned = planSegmentEdit(artifact, { kind: "change", segmentId: "stock", title: "  Held stock ", paths: [PRICE_PATH] }, NEW_SEGMENT_ID)

    expect(artifactOf(planned)?.segments.map((segment) => [segment.title, segment.changedPaths, segment.walkthrough.files.map((file) => file.path)])).toStrictEqual([
      ["Held stock", [PRICE_PATH], [PRICE_PATH]],
      ["Cart", [CART_PATH], [PRICE_PATH, CART_PATH]],
      ["Price", [PRICE_PATH], [PRICE_PATH, CART_PATH]],
    ])
  })

  it("stores the files of a segment once each, in the order of their paths", () => {
    const planned = planSegmentEdit(artifact, { kind: "change", segmentId: "cart", title: "Cart", paths: [PRICE_PATH, CART_PATH, PRICE_PATH] }, NEW_SEGMENT_ID)

    expect(artifactOf(planned)?.segments[1]?.changedPaths).toStrictEqual([CART_PATH, PRICE_PATH])
  })

  it("rejects a segment without a label", () => {
    expect(planSegmentEdit(artifact, { kind: "change", segmentId: "stock", title: " ", paths: [PRICE_PATH] }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "Write a label. A segment cannot be without one.",
    })
  })

  it("rejects a segment without files", () => {
    expect(planSegmentEdit(artifact, { kind: "add", title: "Empty", paths: [] }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "Add a file. A segment cannot be without files.",
    })
  })

  it("rejects a file the change did not touch", () => {
    expect(planSegmentEdit(artifact, { kind: "add", title: "Rates", paths: ["src/rates.ts", PRICE_PATH] }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "This file is not a changed file of the Flight Plan: `src/rates.ts`.",
    })
  })

  it("rejects a segment the Flight Plan does not have", () => {
    expect(planSegmentEdit(artifact, { kind: "remove", segmentId: "gone" }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "This segment is no longer in the Flight Plan.",
    })
  })

  it("adds a segment at the end with nothing written in it", () => {
    const planned = planSegmentEdit(artifact, { kind: "add", title: "Rates", paths: [PRICE_PATH] }, NEW_SEGMENT_ID)

    expect(artifactOf(planned)?.segments.at(-1)).toStrictEqual({
      id: NEW_SEGMENT_ID,
      title: "Rates",
      changedPaths: [PRICE_PATH],
      context: "",
      journey: null,
      blast: null,
      walkthrough: { files: [] },
    })
  })

  it("moves a segment one place up or down", () => {
    expect(segmentIdsOf(planSegmentEdit(artifact, { kind: "move", segmentId: "price", direction: "up" }, NEW_SEGMENT_ID))).toStrictEqual(["stock", "price", "cart"])
    expect(segmentIdsOf(planSegmentEdit(artifact, { kind: "move", segmentId: "stock", direction: "down" }, NEW_SEGMENT_ID))).toStrictEqual(["cart", "stock", "price"])
  })

  it("rejects a move past the first or the last place", () => {
    expect(planSegmentEdit(artifact, { kind: "move", segmentId: "stock", direction: "up" }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "This segment is already the first.",
    })
    expect(planSegmentEdit(artifact, { kind: "move", segmentId: "price", direction: "down" }, NEW_SEGMENT_ID)).toStrictEqual({
      kind: "rejected",
      message: "This segment is already the last.",
    })
  })

  it("removes a segment, and the Flight Plan is segmented only while it has more than one", () => {
    const withTwo = artifactOf(planSegmentEdit(artifact, { kind: "remove", segmentId: "cart" }, NEW_SEGMENT_ID))
    const withOne = withTwo === null ? null : artifactOf(planSegmentEdit(withTwo, { kind: "remove", segmentId: "stock" }, NEW_SEGMENT_ID))

    expect(withTwo).toMatchObject({ isSegmented: true })
    expect(withOne?.segments.map((segment) => segment.id)).toStrictEqual(["price"])
    expect(withOne).toMatchObject({ isSegmented: false })
  })
})
