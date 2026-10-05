import { fixtureSources, linkToFixtureForge } from "@/__tests__/review-fixture"
import { buildCodeLink, codeLinkIdsIn, resolveCodeTarget } from "@/code/links"

describe("codeLinkIdsIn", () => {
  it("lists each code link once", () => {
    expect(
      codeLinkIdsIn(["[a](code:src/a.ts#one) and [b](code:src/a.ts#L3-4)", "[again](code:src/a.ts#one) [web](https://x.dev)"]),
    ).toStrictEqual(["src/a.ts#one", "src/a.ts#L3-4"])
  })
})

describe("resolveCodeTarget", () => {
  it("finds a declaration by its name", () => {
    expect(resolveCodeTarget(fixtureSources, "src/price.ts#priceOf")?.range).toStrictEqual({ lineStart: 11, lineEnd: 12 })
  })

  it("reads a lines target", () => {
    expect(resolveCodeTarget(fixtureSources, "src/price.ts#L3")?.range).toStrictEqual({ lineStart: 3, lineEnd: 3 })
    expect(resolveCodeTarget(fixtureSources, "src/price.ts#L3-5")?.range).toStrictEqual({ lineStart: 3, lineEnd: 5 })
  })

  it("reports nothing for a file, a declaration or lines that are not there", () => {
    expect(resolveCodeTarget(fixtureSources, "src/gone.ts#priceOf")).toBeNull()
    expect(resolveCodeTarget(fixtureSources, "src/price.ts#gone")).toBeNull()
    expect(resolveCodeTarget(fixtureSources, "src/price.ts#L90-91")).toBeNull()
  })
})

describe("buildCodeLink", () => {
  it("shows the target with the lines around it, and focuses the target", () => {
    const resolved = resolveCodeTarget(fixtureSources, "src/price.ts#priceOf")
    const link = resolved === null ? null : buildCodeLink(resolved, "waypoint-price-of", linkToFixtureForge)

    expect(link).toMatchObject({
      pathLabel: "src/price.ts",
      rangeLabel: "Lines 11 to 12, 2 lines",
      anchorId: "waypoint-price-of",
      forgeLink: { href: "https://forge.test/src/price.ts#L11-L12", label: "Open on the forge" },
    })
    expect(link?.lines.map((line) => [line.numberLabel, line.mark, line.isFocused])).toStrictEqual([
      ["9", "context", false],
      ["10", "context", false],
      ["", "removed", true],
      ["11", "added", true],
      ["12", "added", true],
      ["13", "context", false],
      ["14", "context", false],
    ])
  })

  it("has no forge link when the repository has no forge", () => {
    const resolved = resolveCodeTarget(fixtureSources, "src/price.ts#L3")
    const link = resolved === null ? null : buildCodeLink(resolved, null, () => null)

    expect(link).toMatchObject({ rangeLabel: "Line 3", anchorId: null, forgeLink: null })
  })
})
