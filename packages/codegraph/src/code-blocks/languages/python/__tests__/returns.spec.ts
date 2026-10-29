import { codeOf, groupOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const FILE_PATH = "shop/rename.py"

const blocksOf = (...lines: readonly string[]): readonly StoredCodeBlock[] => groupOf({ [FILE_PATH]: codeOf(...lines) }).codeBlocks

const returnsOf = (...lines: readonly string[]): [string, string[]][] =>
  blocksOf(...lines).flatMap((block) =>
    block.returnsAt === undefined ? [] : [[`${block.type} ${block.name ?? ""}`.trimEnd(), block.returnsAt.map(({ line, column }) => `${String(line)}:${String(column)}`)] as [string, string[]]])

describe("the returns of a Python block", () => {
  it("gives each return to the innermost block it is written in", () => {
    expect(returnsOf(
      "def rename(name):",
      "    if not name:",
      "        return None",
      "    for one in [name]:",
      "        if one:",
      "            return one",
      "    return name.strip()",
    )).toStrictEqual([["function rename", ["7:5"]], ["condition", ["3:9"]], ["condition", ["6:13"]]])
  })

  it("gives a return of a function declared inside another to that function", () => {
    expect(returnsOf("def make(prefix):", "    def label(name):", "        return prefix + name", "    return label")).toStrictEqual([
      ["function make", ["4:5"]],
      ["function label", ["3:9"]],
    ])
  })

  it("gives the returns of a method to the method", () => {
    expect(returnsOf("class Store:", "    def total(self):", "        return 1")).toStrictEqual([["method Store.total", ["3:9"]]])
  })

  it("leaves the returns out of a block with none", () => {
    expect(blocksOf("def log(line):", "    print(line)").some((block) => "returnsAt" in block)).toBe(false)
  })
})
