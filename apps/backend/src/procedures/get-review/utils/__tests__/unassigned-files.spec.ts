import { CART_PATH, createArtifact, createSegment, PRICE_PATH } from "@/procedures/get-review/utils/__tests__/review-fixture"
import { buildUnassignedFiles } from "@/procedures/get-review/utils/unassigned-files"

describe("buildUnassignedFiles", () => {
  it("reports nothing while every changed file is in a segment", () => {
    expect(buildUnassignedFiles(createArtifact())).toBeNull()
  })

  it("lists the changed files that are in no segment", () => {
    const artifact = createArtifact({ segments: [createSegment({ changedPaths: [PRICE_PATH] })] })

    expect(buildUnassignedFiles(artifact)).toStrictEqual({
      label: "1 file in no segment",
      message: "1 changed file is in no segment of this Flight Plan.",
      actionLabel: "Show the files",
      title: "Changed files in no segment",
      description: "No segment of this Flight Plan holds these changed files, so nothing in it describes them.",
      publishWarning: "1 changed file is in no segment. The reviewer is told so when they open the Flight Plan.",
      paths: [CART_PATH],
    })
  })

  it("lists every changed file of a Flight Plan that has no segments", () => {
    expect(buildUnassignedFiles(createArtifact({ segments: [] }))).toMatchObject({
      label: "2 files in no segment",
      message: "2 changed files are in no segment of this Flight Plan.",
      paths: [PRICE_PATH, CART_PATH],
    })
  })
})
