import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { unresolvedLinkIdsIn } from "@/procedures/update-nodes/utils/written-links"

const { sources } = DRAFT_ARTIFACT

describe("unresolvedLinkIdsIn", () => {
  it("resolves a declaration the file has and lines inside the file", () => {
    const text = "[`subtotal()`](code:src/cart/subtotal.ts#subtotal) [a line](code:src/cart/subtotal.ts#L4) [lines](code:src/cart/subtotal.ts#L6-9) [lines](code:src/cart/subtotal.ts#L6-L9)"

    expect(unresolvedLinkIdsIn([text], sources)).toStrictEqual([])
  })

  it("reports a file the artifact does not hold, an unknown declaration, lines past the end and a link with no target", () => {
    const text = "[a](code:src/gone.ts#subtotal) [b](code:src/cart/subtotal.ts#toString) [c](code:src/cart/subtotal.ts#L8-40) [d](code:src/cart/subtotal.ts)"

    expect(unresolvedLinkIdsIn([text], sources)).toStrictEqual([
      "src/gone.ts#subtotal",
      "src/cart/subtotal.ts#toString",
      "src/cart/subtotal.ts#L8-40",
      "src/cart/subtotal.ts",
    ])
  })

  it("reports a link that does not resolve inside a tab of a tabs block", () => {
    const text = ":::tabs\n::tab What's added\n- [`subtotal()`](code:src/cart/subtotal.ts#subtotal) and [gone](code:src/gone.ts#L1)\n:::"

    expect(unresolvedLinkIdsIn([text], sources)).toStrictEqual(["src/gone.ts#L1"])
  })

  it("ignores links that are not code links", () => {
    expect(unresolvedLinkIdsIn(["[the docs](https://example.com/a#b)"], sources)).toStrictEqual([])
  })
})
