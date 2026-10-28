import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { codeOf, groupOf } from "./group-fixture"

const ALIAS_PREFIX = "v"
const aliasOf = (position: number): string => `${ALIAS_PREFIX}${String(position)}`

const aliasChainOf = (length: number): string[] =>
  Array.from({ length }, (_, position) => `  const ${aliasOf(position + 1)} = ${aliasOf(position)}`)

const chainedGroupOf = (length: number): StoredCodeGroupGraph =>
  groupOf({
    "src/run.ts": codeOf(
      "const api = { save: () => 1 }",
      "export function run() {",
      `  const ${aliasOf(0)} = api`,
      ...aliasChainOf(length),
      `  return ${aliasOf(length)}.save()`,
      "}",
    ),
  })

const followedOf = (group: StoredCodeGroupGraph, blockId: string): (string | null)[] =>
  group.codeBlocks.filter((block) => block.id === blockId).flatMap((block) => block.outerSymbols.map((symbol) => symbol.member?.blockId ?? null))

describe("following a member to the block it comes from", () => {
  it("follows a destructured name whose neighbour's default reads it, in TypeScript", () => {
    const group = groupOf({
      "src/run.ts": codeOf(
        "const api = { save: () => 1 }",
        "export function run() {",
        "  const { save, retry = save ? save.length : 0 } = api",
        "  return save()",
        "}",
      ),
    })
    expect(followedOf(group, "src/run.ts#function@2:1")).toStrictEqual(["src/run.ts#function@1:15"])
    expect(followedOf(group, "src/run.ts#condition@3:25")).toStrictEqual(["src/run.ts#function@1:15", "src/run.ts#function@1:15"])
  })

  it("leaves the member unfollowed when nothing gives the destructured value", () => {
    const group = groupOf({
      "src/range.ts": codeOf(
        "export function read(contentRange) {",
        "  const { start, size, end = size ? size - 1 : null } = contentRange",
        "  return size.toFixed()",
        "}",
      ),
    })
    expect(followedOf(group, "src/range.ts#function@1:1")).toStrictEqual([null])
  })

  it("follows a key of a dictionary that reads another of its own keys, in Python", () => {
    const group = groupOf({
      "shop/run.py": codeOf(
        "def save():",
        "    return 1",
        "def run():",
        "    config = {'save': save, 'retry': config['save'].retry}",
        "    return config['save']()",
      ),
    })
    expect(followedOf(group, "shop/run.py#function@3:1")).toStrictEqual(["shop/run.py#property@4:15"])
    expect(followedOf(group, "shop/run.py#property@4:29")).toStrictEqual(["shop/run.py#property@4:15"])
  })

  it("follows a key of a dictionary whose other key reads a key it does not have, in Python", () => {
    const group = groupOf({ "shop/run.py": codeOf("def run():", "    config = {'a': config['b'].c}", "    return config['a'].d.e()") })
    expect(followedOf(group, "shop/run.py#function@1:1")).toStrictEqual(["shop/run.py#property@2:15"])
  })

  it("follows a member through a short chain of names that each hold the one before", () => {
    expect(followedOf(chainedGroupOf(10), "src/run.ts#function@2:1")).toStrictEqual(["src/run.ts#function@1:15"])
  })

  it("stops following a member through a chain of names longer than it ever follows", () => {
    expect(followedOf(chainedGroupOf(1300), "src/run.ts#function@2:1")).toStrictEqual([null])
  })
})
