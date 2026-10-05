import { blobLinkOf, type ForgeLocation } from "@/procedures/get-review/utils/forge-links"

const GITHUB_LOCATION: ForgeLocation = { forge: "gh", forgeSlug: "acme/storefront", commit: "abc1234" }

describe("blobLinkOf", () => {
  it("links a range of a file at the reviewed commit", () => {
    expect(blobLinkOf(GITHUB_LOCATION, "src/price.ts", { lineStart: 11, lineEnd: 12 })).toStrictEqual({
      href: "https://github.com/acme/storefront/blob/abc1234/src/price.ts#L11-L12",
      label: "Open on GitHub",
    })
  })

  it("links the whole file when there is no range", () => {
    expect(blobLinkOf(GITHUB_LOCATION, "src/price.ts", null)?.href).toBe(
      "https://github.com/acme/storefront/blob/abc1234/src/price.ts",
    )
  })

  it("has no link for a repository on plain git", () => {
    expect(blobLinkOf({ forge: "git", forgeSlug: null, commit: "abc1234" }, "src/price.ts", null)).toBeNull()
  })
})
