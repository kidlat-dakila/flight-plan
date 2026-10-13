import { codeLinesIn, removedLineNumberAt } from "@/code/lines"
import { parseMarkedSource } from "@/code/marked-source"

const source = parseMarkedSource(
  "src/price.ts",
  "typescript",
  [" one", " two", "-old three", "-old four", "+new three", " five", "-old six"].join("\n"),
)

describe("removedLineNumberAt", () => {
  it("numbers a removed line as the file had it before the change", () => {
    expect(source.lines.map((_line, index) => removedLineNumberAt(source.lines, index))).toStrictEqual([null, null, 3, 4, null, null, 6])
  })
})

describe("codeLinesIn", () => {
  it("gives a removed line its old number beside the empty new one, and no old number to the other lines", () => {
    const lines = codeLinesIn({ source, tokenLines: [] }, { start: 1, end: 4 }, null)

    expect(lines.map((line) => [line.mark, line.numberLabel, line.removedNumberLabel])).toStrictEqual([
      ["context", "2", ""],
      ["removed", "", "3"],
      ["removed", "", "4"],
      ["added", "3", ""],
    ])
  })
})
