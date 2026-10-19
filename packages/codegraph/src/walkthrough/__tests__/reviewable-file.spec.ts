import { createArtifact, createCodeBlock, createSegment, createWaypoint, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { listRootBlockWaypointIds } from "@/walkthrough/reviewable-file"

const spanning = (lineStart: number, lineEnd: number) => [{ start: { line: lineStart, column: 1 }, end: { line: lineEnd, column: 1 } }]

const PRICE_OF = createCodeBlock(`${PRICE_PATH}#function@11:1`, PRICE_PATH, { lineOfCodeRangeReference: spanning(11, 12) })
const FORMAT = createCodeBlock(`${PRICE_PATH}#function@14:1`, PRICE_PATH, { name: "format", lineOfCodeRangeReference: spanning(14, 14) })

const ARTIFACT = createArtifact({
  sources: [priceSource],
  segments: [
    createSegment({
      walkthrough: {
        files: [{
          path: PRICE_PATH,
          waypoints: [
            createWaypoint("price-of", "priceOf", { codeBlocks: [PRICE_OF], children: [createWaypoint("price-of.1", "priceOf › held"), createWaypoint("price-of.2", "priceOf › rates")] }),
            createWaypoint("format", "format", { codeBlocks: [FORMAT] }),
          ],
        }],
      },
    }),
  ],
})

describe("listRootBlockWaypointIds", () => {
  it("lists every waypoint in a root code block, the steps of a declaration included", () => {
    expect(listRootBlockWaypointIds(ARTIFACT, `${PRICE_PATH}#function:priceOf`)).toStrictEqual(["price-of", "price-of.1", "price-of.2"])
    expect(listRootBlockWaypointIds(ARTIFACT, `${PRICE_PATH}#function:format`)).toStrictEqual(["format"])
  })

  it("lists none for a root code block the review does not have", () => {
    expect(listRootBlockWaypointIds(ARTIFACT, "src/gone.ts#function:gone")).toStrictEqual([])
  })
})
