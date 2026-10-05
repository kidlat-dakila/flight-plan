import { HELD_STOCK_ARTIFACT } from "@/procedures/get-review/utils/mocks/held-stock"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"

const SCAFFOLD: ReviewScaffold = {
  artifact: HELD_STOCK_ARTIFACT,
  baseCommit: "0000000",
  request: {
    preset: "onboardee",
    order: "custom",
    customOrder: "Tests first.",
    writer: { kind: "agent", agent: "claude", model: "opus", effort: "high" },
    requestedAt: new Date("2026-10-01T12:00:00.000Z"),
  },
}

describe("stored review", () => {
  it("reads back the artifact, the base commit and the reviewer's choices it wrote", () => {
    expect(parseStoredReview(formatStoredReview(SCAFFOLD))).toStrictEqual(SCAFFOLD)
  })

  it("writes the format version, the kind and the choices in the meta block", () => {
    expect(JSON.parse(formatStoredReview(SCAFFOLD))).toMatchObject({
      schema: 1,
      meta: {
        kind: "review",
        baseCommit: "0000000",
        request: { preset: "onboardee", order: "custom", requestedAt: "2026-10-01T12:00:00.000Z" },
      },
      artifact: { title: HELD_STOCK_ARTIFACT.title, status: "complete" },
    })
  })

  it("has no answer for text that is not a stored review", () => {
    expect(parseStoredReview("not json")).toBeNull()
    expect(parseStoredReview("{\"schema\":2}")).toBeNull()
    expect(parseStoredReview(formatStoredReview(SCAFFOLD).replace("\"onboardee\"", "\"unknown\""))).toBeNull()
  })
})
