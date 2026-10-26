import { commentRangeBetween } from "@/routes/pr-reviews/$repoName/-hooks/use-text-selection"

const newLine = (lineLabel: string) => ({ side: "new" as const, lineLabel })

describe("commentRangeBetween", () => {
  it("spans the selected lines, whichever way they were selected", () => {
    expect(commentRangeBetween(newLine("7"), newLine("11"))).toStrictEqual({ side: "new", startLineLabel: "7", lineLabel: "11" })
    expect(commentRangeBetween(newLine("11"), newLine("7"))).toStrictEqual({ side: "new", startLineLabel: "7", lineLabel: "11" })
  })

  it("keeps to the line the selection ended on when it started on the other side of the change or on no line", () => {
    const single = { side: "new", startLineLabel: "9", lineLabel: "9" }

    expect(commentRangeBetween({ side: "old", lineLabel: "4" }, newLine("9"))).toStrictEqual(single)
    expect(commentRangeBetween(null, newLine("9"))).toStrictEqual(single)
  })

  it("has no range when the selection ends on a line that takes no comment", () => {
    expect(commentRangeBetween(newLine("7"), null)).toBeNull()
  })
})
