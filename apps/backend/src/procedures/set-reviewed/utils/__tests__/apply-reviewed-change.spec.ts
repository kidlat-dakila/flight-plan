import { createArtifact, createSegment, createWaypoint, PRICE_PATH } from "@/procedures/get-review/utils/__tests__/review-fixture"
import { applyArtifactReviewedChange } from "@/procedures/set-reviewed/utils/apply-reviewed-change"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"

const artifact = createArtifact({
  segments: [
    createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("parent", "priceOf", { children: [createWaypoint("child", "format"), createWaypoint("other", "format")] }),
              createWaypoint("sibling", "format"),
            ],
          },
        ],
      },
    }),
  ],
})

const keysOf = (record: Readonly<Record<string, string>>): string[] => Object.keys(record).sort()

describe("applyArtifactReviewedChange", () => {
  it("marks a waypoint together with the waypoints nested in it", () => {
    const marks = applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "waypoint", id: "parent" }, true)

    expect(keysOf(marks?.waypoints ?? {})).toStrictEqual(["child", "other", "parent"])
    expect(marks?.files).toStrictEqual({})
  })

  it("marks a file together with every waypoint in it", () => {
    const marks = applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "file", path: PRICE_PATH }, true)

    expect(keysOf(marks?.waypoints ?? {})).toStrictEqual(["child", "other", "parent", "sibling"])
    expect(keysOf(marks?.files ?? {})).toStrictEqual([PRICE_PATH])
  })

  it("takes the mark off a waypoint, off the waypoints nested in it and off its file", () => {
    const reviewed = applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "file", path: PRICE_PATH }, true)
    const marks = applyArtifactReviewedChange(artifact, reviewed ?? NO_REVIEWED_MARKS, { kind: "waypoint", id: "parent" }, false)

    expect(keysOf(marks?.waypoints ?? {})).toStrictEqual(["sibling"])
    expect(marks?.files).toStrictEqual({})
  })

  it("takes the mark off a file and off every waypoint in it", () => {
    const reviewed = applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "waypoint", id: "sibling" }, true)

    expect(applyArtifactReviewedChange(artifact, reviewed ?? NO_REVIEWED_MARKS, { kind: "file", path: PRICE_PATH }, false)).toStrictEqual({
      waypoints: {},
      files: {},
      rootBlocks: {},
    })
  })

  it("reports nothing for a waypoint or a file the artifact does not have", () => {
    expect(applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "waypoint", id: "gone" }, true)).toBeNull()
    expect(applyArtifactReviewedChange(artifact, NO_REVIEWED_MARKS, { kind: "file", path: "src/gone.ts" }, true)).toBeNull()
  })
})
