import { classificationOfBlock, classificationViewOf } from "@/code-blocks/classification-view"

describe("classificationOfBlock", () => {
  it("picks the first classification, which the hierarchy ranks highest", () => {
    expect(classificationOfBlock({ classifications: ["page", "component", "database-read-write"] })).toBe("page")
  })

  it("reads a block with no classification as logic", () => {
    expect(classificationOfBlock({ classifications: [] })).toBe("logic")
  })
})

describe("classificationViewOf", () => {
  it("gives the classification with its label", () => {
    expect(classificationViewOf({ classifications: ["third-party-integration", "api-request"] })).toStrictEqual({
      key: "third-party-integration",
      label: "Third-party integration",
    })
  })
})
