import { composeAt } from "@/routes/pr-reviews/$repoName/-hooks/use-review-discussion"

const PATH = "src/price.ts"

const newLine = (lineLabel: string) => ({ side: "new" as const, lineLabel })

const composingOn = (anchorLineLabel: string, startLineLabel = anchorLineLabel, lineLabel = anchorLineLabel) => ({
  path: PATH,
  anchorLineLabel,
  range: { side: "new" as const, startLineLabel, lineLabel },
})

describe("composeAt", () => {
  it("starts a comment on the one line that was chosen", () => {
    expect(composeAt(null, PATH, newLine("7"), false)).toStrictEqual(composingOn("7"))
    expect(composeAt(composingOn("3"), PATH, newLine("7"), false)).toStrictEqual(composingOn("7"))
  })

  it("stretches the range from the first line chosen to the one reached, in either direction", () => {
    expect(composeAt(composingOn("7"), PATH, newLine("11"), true)).toStrictEqual(composingOn("7", "7", "11"))
    expect(composeAt(composingOn("7", "7", "11"), PATH, newLine("4"), true)).toStrictEqual(composingOn("7", "4", "7"))
  })

  it("starts over instead of stretching into another file or onto the other side of the change", () => {
    expect(composeAt(composingOn("7"), "src/cart.ts", newLine("9"), true)).toMatchObject({ path: "src/cart.ts", anchorLineLabel: "9" })
    expect(composeAt(composingOn("7"), PATH, { side: "old", lineLabel: "9" }, true)).toMatchObject({
      anchorLineLabel: "9",
      range: { side: "old", startLineLabel: "9", lineLabel: "9" },
    })
    expect(composeAt(null, PATH, newLine("9"), true)).toStrictEqual(composingOn("9"))
  })

  it("stops composing when no line is given", () => {
    expect(composeAt(composingOn("7"), PATH, null, false)).toBeNull()
  })
})
