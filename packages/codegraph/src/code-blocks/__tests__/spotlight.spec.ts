import { isInSpotlight, spotlightClassificationsOf, spotlightViewOf } from "@/code-blocks/spotlight"
import type { CodeBlockClassification } from "@flightplan/configurations"

const changed = (...diffClassifications: CodeBlockClassification[]) => ({ diffClassifications })

describe("spotlightClassificationsOf", () => {
  it("gives the spotlight classifications what changed in the blocks earns, in the order of the hierarchy", () => {
    const blocks = [changed("validation"), changed("component", "database-read-write")]

    expect(spotlightClassificationsOf(blocks, ["validation", "database-read-write", "security"])).toStrictEqual(["database-read-write", "validation"])
  })

  it("reads what changed, not what the block is", () => {
    expect(spotlightClassificationsOf([{ diffClassifications: [] }], ["component"])).toStrictEqual([])
  })
})

describe("isInSpotlight", () => {
  it("puts a block in the spotlight when one of its changed classifications is", () => {
    expect(isInSpotlight([changed("page")], ["page"])).toBe(true)
    expect(isInSpotlight([changed("page")], ["security"])).toBe(false)
    expect(isInSpotlight([changed("page")], [])).toBe(false)
  })
})

describe("spotlightViewOf", () => {
  it("names the matched classifications with their labels", () => {
    expect(spotlightViewOf([changed("database-read-write", "api-request")], ["api-request", "database-read-write"])).toStrictEqual({
      label: "Spotlight",
      classifications: [
        { key: "database-read-write", label: "Database read/write" },
        { key: "api-request", label: "API request" },
      ],
    })
  })

  it("gives nothing outside the spotlight", () => {
    expect(spotlightViewOf([changed("logic")], ["security"])).toBeNull()
  })
})
