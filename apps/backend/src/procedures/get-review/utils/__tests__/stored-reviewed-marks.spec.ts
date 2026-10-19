import { formatStoredReviewedMarks, parseStoredReviewedMarks } from "@/procedures/get-review/utils/stored-reviewed-marks"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"

const marks = {
  waypoints: { "line-total": "1f2e" },
  files: { "src/cart/subtotal.ts": "3c4d" },
  rootBlocks: { "src/cart/subtotal.ts#function:subtotal": "5e6f" },
}

describe("stored reviewed marks", () => {
  it("reads back what it wrote", () => {
    expect(parseStoredReviewedMarks(formatStoredReviewedMarks(marks))).toStrictEqual(marks)
  })

  it("reads no marks from text it cannot read", () => {
    expect(parseStoredReviewedMarks("not json")).toStrictEqual(NO_REVIEWED_MARKS)
    expect(parseStoredReviewedMarks("{\"waypoints\":{}}")).toStrictEqual(NO_REVIEWED_MARKS)
    expect(parseStoredReviewedMarks("{\"waypoints\":{\"a\":1},\"files\":{},\"rootBlocks\":{}}")).toStrictEqual(NO_REVIEWED_MARKS)
  })
})
