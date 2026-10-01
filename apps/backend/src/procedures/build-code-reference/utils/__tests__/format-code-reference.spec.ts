import { formatCodeReference } from "@/procedures/build-code-reference/utils/format-code-reference"

const PARTS = { repositoryName: "storefront", commit: "9f2c1ab", path: "src/price.ts" }

describe("formatCodeReference", () => {
  it("names the repository, the commit, the file and the lines", () => {
    expect(formatCodeReference({ ...PARTS, lineStart: 3, lineEnd: 9 })).toBe("storefront@9f2c1ab:src/price.ts#L3-9")
  })

  it("names a single line once", () => {
    expect(formatCodeReference({ ...PARTS, lineStart: 4, lineEnd: 4 })).toBe("storefront@9f2c1ab:src/price.ts#L4")
  })

  it("orders the lines of a selection made upwards", () => {
    expect(formatCodeReference({ ...PARTS, lineStart: 9, lineEnd: 3 })).toBe("storefront@9f2c1ab:src/price.ts#L3-9")
  })
})
