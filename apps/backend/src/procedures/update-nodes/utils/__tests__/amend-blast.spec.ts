import { DRAFT_SEGMENT, WALKTHROUGH_ONLY_SEGMENT, messageOf } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { amendBlast } from "@/procedures/update-nodes/utils/amend-blast"
import { amendJourney } from "@/procedures/update-nodes/utils/amend-journey"

describe("amendBlast", () => {
  it("refuses a verdict on a changed declaration and a contract on a dependent", () => {
    const outcome = amendBlast([DRAFT_SEGMENT], [
      { id: "b-subtotal", verdict: "breaks", effect: "It breaks." },
      { id: "b-cart-total", contract: { before: null, now: "Renders the total." } },
    ])

    expect(messageOf(outcome)).toContain("`b-subtotal`, `b-cart-total` got the wrong one.")
  })

  it("refuses a verdict with no effect", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ id: "b-cart-total", verdict: "breaks" }])).toMatchObject({
      kind: "refused",
      message: "A verdict needs the evidence for it: `b-cart-total` got a `verdict` and no `effect`. Nothing was written.",
    })
  })

  it("refuses an effect on a dependent that has no verdict", () => {
    expect(amendBlast([DRAFT_SEGMENT], [{ id: "b-cart-total", effect: "It formats the number." }])).toMatchObject({ kind: "refused" })
  })

  it("lets a later call reword the effect of a dependent that has a verdict", () => {
    const assessed = amendBlast([DRAFT_SEGMENT], [{ id: "b-cart-total", verdict: "unaffected", effect: "First wording." }])
    const segments = assessed.kind === "amended" ? assessed.segments : []

    expect(amendBlast(segments, [{ id: "b-cart-total", effect: "Second wording." }])).toMatchObject({
      kind: "amended",
      segments: [{ blast: { nodes: [{}, { verdict: "unaffected", effect: "Second wording." }, {}] } }],
    })
  })

  it("refuses to write into an artifact with no Blast Diagram", () => {
    expect(amendBlast([WALKTHROUGH_ONLY_SEGMENT], [{ id: "b-subtotal", label: "The total" }])).toStrictEqual({
      kind: "refused",
      message: "This artifact has no Blast Diagram to write into. Nothing was written.",
    })
  })
})

describe("amendJourney", () => {
  it("writes an Entry Point Node's label and description", () => {
    expect(amendJourney([DRAFT_SEGMENT], [{ id: "click-checkout", label: "A customer checks out", description: "The cart page posts the cart." }])).toMatchObject({
      kind: "amended",
      segments: [{ journey: { nodes: [{ kind: "entry-point", label: "A customer checks out", description: "The cart page posts the cart." }, { label: null }] } }],
    })
  })

  it("refuses a category on an Entry Point Node", () => {
    expect(messageOf(amendJourney([DRAFT_SEGMENT], [{ id: "click-checkout", category: "ui" }]))).toContain("An Entry Point Node has no category: `click-checkout`.")
  })

  it("refuses to write into an artifact with no Journey Flow Diagram", () => {
    expect(amendJourney([WALKTHROUGH_ONLY_SEGMENT], [{ id: "j-subtotal", label: "Rounds" }])).toMatchObject({ kind: "refused" })
  })
})
