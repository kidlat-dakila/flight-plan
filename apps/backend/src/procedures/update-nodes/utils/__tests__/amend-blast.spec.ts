import { DRAFT_SEGMENT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { amendBlast } from "@/procedures/update-nodes/utils/amend-blast"

const CART_TOTAL_PATH = "src/cart/CartTotal.tsx"
const CHANGED_PATH = "src/cart/subtotal.ts"

const nodeAt = (outcome: ReturnType<typeof amendBlast>, path: string): unknown =>
  outcome.kind === "amended" ? outcome.segments[0].blastDiagram?.nodes.find((node) => node.path === path) : null

describe("amendBlast", () => {
  it("writes an impact type with its reason on a file the change did not touch", () => {
    const outcome = amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "breaks", impactReason: "It divides by the total." }])

    expect(nodeAt(outcome, CART_TOTAL_PATH)).toStrictEqual({
      path: CART_TOTAL_PATH,
      diffType: null,
      impactType: "breaks",
      impactReason: "It divides by the total.",
      isRequired: true,
    })
  })

  it("rewrites the reason of a file that already has an impact type", () => {
    const first = amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "breaks", impactReason: "It divides by the total." }])
    const segments = first.kind === "amended" ? first.segments : []

    const outcome = amendBlast(segments, [{ path: CART_TOTAL_PATH, impactReason: "It divides by the total, which can now be zero." }])

    expect(nodeAt(outcome, CART_TOTAL_PATH)).toMatchObject({ impactType: "breaks", impactReason: "It divides by the total, which can now be zero.", isRequired: true })
  })

  it("refuses an impact on a file of the change", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ path: CHANGED_PATH, impactType: "unaffected" }])).toStrictEqual({
      kind: "refused",
      message: "An impact is what the change does to a file it did not touch, and `src/cart/subtotal.ts` is part of the change. Nothing was written.",
    })
  })

  it("refuses a file that breaks or changes behaviour with no reason", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "behaviour-changes" }])).toStrictEqual({
      kind: "refused",
      message: "A file the change breaks or changes needs the reason: `src/cart/CartTotal.tsx` got an `impactType` and no `impactReason`. Nothing was written.",
    })
  })

  it("writes an unaffected file with no reason", () => {
    const outcome = amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "unaffected" }])

    expect(nodeAt(outcome, CART_TOTAL_PATH)).toMatchObject({ impactType: "unaffected", impactReason: null, isRequired: true })
  })

  it("refuses a reason on an unaffected file", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "unaffected", impactReason: "It formats the number." }])).toStrictEqual({
      kind: "refused",
      message: "An unaffected file takes no reason: `src/cart/CartTotal.tsx` got an `impactReason`. Send `impactType` alone. Nothing was written.",
    })
  })

  it("drops the reason of a file that turns out unaffected", () => {
    const first = amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactType: "breaks", impactReason: "It divides by the total." }])
    const segments = first.kind === "amended" ? first.segments : []

    const outcome = amendBlast(segments, [{ path: CART_TOTAL_PATH, impactType: "unaffected" }])

    expect(nodeAt(outcome, CART_TOTAL_PATH)).toMatchObject({ impactType: "unaffected", impactReason: null, isRequired: true })
  })

  it("refuses a reason on a file with no impact type", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ path: CART_TOTAL_PATH, impactReason: "It formats the number." }])).toStrictEqual({
      kind: "refused",
      message: "An impact reason explains an impact type: `src/cart/CartTotal.tsx` got an `impactReason` and has no `impactType`. Nothing was written.",
    })
  })

  it("refuses a path the diagram does not have", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ path: "src/gone.ts", impactType: "unaffected" }])).toMatchObject({ kind: "refused" })
  })

  it("refuses to write into a segment with no Blast Diagram", () => {
    expect(amendBlast([{ ...DRAFT_SEGMENT, blastDiagram: null }], [{ path: CART_TOTAL_PATH, impactType: "unaffected" }])).toStrictEqual({
      kind: "refused",
      message: "This artifact has no Blast Diagram to write into. Nothing was written.",
    })
  })
})
