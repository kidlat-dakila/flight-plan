import {
  DRAFT_ARTIFACT,
  PRICE_PATH,
  SUBTOTAL_PATH,
  TWO_SEGMENT_ARTIFACT,
  WALKTHROUGH_ONLY_ARTIFACT, messageOf,
} from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { amendDocument } from "@/procedures/update-document/utils/amend-document"

describe("amendDocument", () => {
  it("writes only the fields it is given", () => {
    const outcome = amendDocument(DRAFT_ARTIFACT, { context: "A cart could be a cent off.", intro: "The price first, then the total." })

    expect(outcome).toMatchObject({
      kind: "amended",
      artifact: { segments: [{ context: "A cart could be a cent off.", walkthrough: { intro: "The price first, then the total." } }] },
    })
  })

  it("puts the File Sections in the order given", () => {
    const outcome = amendDocument(DRAFT_ARTIFACT, { order: { files: [SUBTOTAL_PATH, PRICE_PATH] } })

    expect(outcome).toMatchObject({ artifact: { segments: [{ walkthrough: { files: [{ path: SUBTOTAL_PATH }, { path: PRICE_PATH }] } }] } })
  })

  it("refuses an order that leaves a File Section out", () => {
    expect(amendDocument(DRAFT_ARTIFACT, { order: { files: [SUBTOTAL_PATH] } })).toStrictEqual({
      kind: "refused",
      message: "An order names every File Section exactly once, and this one leaves out `src/catalog/price.ts`. Nothing was written.",
    })
  })

  it("refuses an order that names a path twice or a path with no File Section", () => {
    expect(messageOf(amendDocument(DRAFT_ARTIFACT, { order: { files: [SUBTOTAL_PATH, PRICE_PATH, PRICE_PATH] } }))).toContain("names a path twice")
    expect(messageOf(amendDocument(DRAFT_ARTIFACT, { order: { files: [SUBTOTAL_PATH, PRICE_PATH, "src/gone.ts"] } }))).toContain("no File Section for `src/gone.ts`")
  })

  it("takes a reason for a missing diagram only where the diagram is missing", () => {
    expect(amendDocument(DRAFT_ARTIFACT, { journeyAbsence: "Two edits in one file." })).toMatchObject({ kind: "refused" })
    expect(amendDocument(WALKTHROUGH_ONLY_ARTIFACT, { journeyAbsence: "Two edits in one file.", blastAbsence: "Nothing uses it." })).toMatchObject({
      kind: "amended",
      artifact: { segments: [{ journeyAbsence: "Two edits in one file.", blastAbsence: "Nothing uses it." }] },
    })
  })

  it("refuses a code link that does not resolve", () => {
    const context = "A cart could be a cent off.\n\n- [The total](code:src/cart/total.ts#total) is rounded once."

    expect(messageOf(amendDocument(DRAFT_ARTIFACT, { context }))).toContain("`code:src/cart/total.ts#total`")
  })

  it("asks which segment to write when the artifact has several", () => {
    expect(messageOf(amendDocument(TWO_SEGMENT_ARTIFACT, { context: "Why." }))).toContain("This artifact has 2 segments: first, second.")
    expect(amendDocument(TWO_SEGMENT_ARTIFACT, { segmentId: "second", context: "Why." })).toMatchObject({
      artifact: { segments: [{ context: "" }, { context: "Why." }] },
    })
  })

  it("refuses a call that writes nothing", () => {
    expect(amendDocument(DRAFT_ARTIFACT, {})).toMatchObject({ kind: "refused" })
  })
})
