import { descriptionUrlOf, withPublication } from "@/procedures/publish-artifact/utils/plan-publication"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const EARLIER = new Date("2026-10-01T09:00:00.000Z")

describe("descriptionUrlOf", () => {
  it("links the uploaded file from the pull request description", () => {
    expect(descriptionUrlOf("https://github.com/acme/storefront/pull/412")).toBe("https://github.com/acme/storefront/pull/412#flight-plan-review")
  })

  it("has no address when there is no pull request", () => {
    expect(descriptionUrlOf(null)).toBeNull()
  })
})

describe("withPublication", () => {
  it("replaces an earlier publication of the same kind and keeps the other", () => {
    const publications = withPublication(
      [
        { kind: "claude", url: "old", publishedAt: EARLIER },
        { kind: "description", url: "kept", publishedAt: EARLIER },
      ],
      { kind: "claude", url: "new", publishedAt: NOW },
    )

    expect(publications).toStrictEqual([
      { kind: "description", url: "kept", publishedAt: EARLIER },
      { kind: "claude", url: "new", publishedAt: NOW },
    ])
  })
})
