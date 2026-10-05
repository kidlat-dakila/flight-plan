import type { Hunk } from "@/procedures/request-review/utils/scaffold/hunks"
import { buildSourceLines } from "@/procedures/request-review/utils/scaffold/source-lines"

const NO_CHANGE: Hunk = { added: [], removed: [], isCreated: false }

describe("buildSourceLines", () => {
  it("numbers every line of the file and marks the added ones", () => {
    const hunk: Hunk = { ...NO_CHANGE, added: [{ lineStart: 2, lineEnd: 2 }] }

    expect(buildSourceLines("one\ntwo\nthree\n", hunk)).toStrictEqual([
      { text: "one", mark: "context", number: 1 },
      { text: "two", mark: "added", number: 2 },
      { text: "three", mark: "context", number: 3 },
    ])
  })

  it("puts removed lines, without a number, before the line that follows them", () => {
    const hunk: Hunk = {
      added: [{ lineStart: 2, lineEnd: 2 }],
      removed: [{ afterLine: 1, lines: ["old two"] }, { afterLine: 0, lines: ["old first"] }],
      isCreated: false,
    }

    expect(buildSourceLines("one\ntwo", hunk).map((line) => `${line.mark}:${line.text}:${String(line.number)}`)).toStrictEqual([
      "removed:old first:null",
      "context:one:1",
      "removed:old two:null",
      "added:two:2",
    ])
  })

  it("puts lines removed from the end of the file after its last line", () => {
    const hunk: Hunk = { ...NO_CHANGE, removed: [{ afterLine: 1, lines: ["gone"] }] }

    expect(buildSourceLines("kept\n", hunk)).toStrictEqual([
      { text: "kept", mark: "context", number: 1 },
      { text: "gone", mark: "removed", number: null },
    ])
  })

  it("shows only the removed lines of a file whose text cannot be read", () => {
    const hunk: Hunk = { ...NO_CHANGE, removed: [{ afterLine: 0, lines: ["a", "b"] }] }

    expect(buildSourceLines(null, hunk).map((line) => line.text)).toStrictEqual(["a", "b"])
  })
})
