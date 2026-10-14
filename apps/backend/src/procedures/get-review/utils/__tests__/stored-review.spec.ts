import { parse } from "devalue"
import { HELD_STOCK_ARTIFACT } from "@/procedures/get-review/utils/mocks/held-stock"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"

const SCAFFOLD: ReviewScaffold = {
  artifact: HELD_STOCK_ARTIFACT,
  baseCommit: "0000000",
  request: {
    configurationId: "onboardee",
    preset: "onboardee",
    order: "custom",
    customOrder: "Tests first.",
    writer: { kind: "agent", agent: "claude", model: "opus", effort: "high" },
    requestedAt: new Date("2026-10-01T12:00:00.000Z"),
  },
}

const BLOCK_LABELS_AFTER_A_FIELD = /,"blockLabels":\d+/g
const BLOCK_LABELS_BEFORE_A_FIELD = /"blockLabels":\d+,/g

describe("stored review", () => {
  it("reads back the artifact, the base commit and the reviewer's choices it wrote", () => {
    expect(parseStoredReview(formatStoredReview(SCAFFOLD))).toStrictEqual(SCAFFOLD)
  })

  it("writes the format version, the kind and the choices in the meta block", () => {
    expect(parse(formatStoredReview(SCAFFOLD))).toMatchObject({
      schema: 2,
      meta: {
        kind: "review",
        baseCommit: "0000000",
        request: { configurationId: "onboardee", preset: "onboardee", order: "custom", requestedAt: "2026-10-01T12:00:00.000Z" },
      },
      artifact: { title: HELD_STOCK_ARTIFACT.title, status: "complete" },
    })
  })

  it("keeps a block that two nodes hold as one block, and the code group of two segments as one group", () => {
    const read = parseStoredReview(formatStoredReview(SCAFFOLD))
    const [journey] = (read?.artifact.segments ?? []).flatMap((segment) => (segment.journey === null ? [] : [segment.journey]))
    const [node] = journey.journeyNodes

    expect(journey.astCodeGroup.codeBlocks).toContain(node.codeBlocks[0])
    expect(node.diffCodeBlocks.every((block) => node.codeBlocks.includes(block))).toBe(true)
  })

  it("reads a review saved before a node had block labels, with none on each node", () => {
    const older = formatStoredReview(SCAFFOLD).replaceAll(BLOCK_LABELS_AFTER_A_FIELD, "").replaceAll(BLOCK_LABELS_BEFORE_A_FIELD, "")

    expect(older).not.toContain("blockLabels")
    expect(parseStoredReview(older)).toStrictEqual(SCAFFOLD)
  })

  it("has no answer for text that is not a stored review", () => {
    expect(parseStoredReview("not json")).toBeNull()
    expect(parseStoredReview("[{\"schema\":1},3]")).toBeNull()
    expect(parseStoredReview(formatStoredReview(SCAFFOLD).replace("\"onboardee\"", "\"unknown\""))).toBeNull()
  })
})
