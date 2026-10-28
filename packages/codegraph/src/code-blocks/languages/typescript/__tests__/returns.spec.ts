import { codeOf, groupOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const FILE_PATH = "src/rename.ts"

const blocksOf = (...lines: readonly string[]): readonly StoredCodeBlock[] => groupOf({ [FILE_PATH]: codeOf(...lines) }).codeBlocks

const returnsOf = (...lines: readonly string[]): [string, string[]][] =>
  blocksOf(...lines).flatMap((block) =>
    block.returnsAt === undefined ? [] : [[`${block.type} ${block.name ?? ""}`.trimEnd(), block.returnsAt.map(({ line, column }) => `${String(line)}:${String(column)}`)] as [string, string[]]])

describe("the returns of a TypeScript block", () => {
  it("gives each return to the innermost block it is written in", () => {
    expect(returnsOf(
      "export function rename(name) {",
      "  if (!name) {",
      "    return null",
      "  }",
      "  for (const one of [name]) {",
      "    if (one) return one",
      "  }",
      "  return name.trim()",
      "}",
    )).toStrictEqual([["function rename", ["8:3"]], ["condition", ["3:5"]], ["condition", ["6:14"]]])
  })

  it("gives a return inside a function written in place to that function, not to the one around it", () => {
    expect(returnsOf(
      "export const names = (users) => {",
      "  const found = users.filter((user) => { return user.name })",
      "  return found",
      "}",
    )).toStrictEqual([["function names", ["3:3"]], ["function", ["2:42"]]])
  })

  it("gives a component the return of its markup, and an event handler written in place its own returns", () => {
    const blocks = groupOf({
      "src/count.tsx": codeOf("export const Count = ({ n }) => {", "  const clicked = () => { if (n) { return n } return 0 }", "  return <button onClick={clicked}>{n}</button>", "}"),
    }).codeBlocks

    expect(blocks.flatMap((block) => (block.returnsAt === undefined ? [] : [[block.id, block.returnsAt.length]]))).toStrictEqual([
      ["src/count.tsx#component@1:1", 1],
      ["src/count.tsx#function@2:3", 1],
      ["src/count.tsx#condition@2:27", 1],
    ])
  })

  it("gives the returns of a method to the method", () => {
    expect(returnsOf("export class Store {", "  total() {", "    return 1", "  }", "}")).toStrictEqual([["method Store.total", ["3:5"]]])
  })

  it("leaves the returns out of a block with none", () => {
    expect(blocksOf("export const log = (line) => {", "  console.log(line)", "}").some((block) => "returnsAt" in block)).toBe(false)
  })
})
