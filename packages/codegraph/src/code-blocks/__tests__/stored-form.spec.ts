import { linkCodeGroupGraph } from "@/code-blocks/link-group"
import { storeCodeGroupGraph } from "@/code-blocks/store-group"
import type { ASTCodeGroupGraph, CodeBlock } from "@/code-blocks/types"
import { codeOf, groupOf, rangeAt } from "./group-fixture"

const STORED = groupOf(
  {
    "src/save-button.tsx": codeOf("export function SaveButton({ onSave }) {", "  return <button onClick={onSave}>Save</button>", "}", "export const LIMIT = 3"),
    "src/review-page.tsx": codeOf(
      "import { useQuery } from \"lib\"",
      "import { LIMIT, SaveButton } from \"./save-button\"",
      "const saveReview = () => LIMIT",
      "export const ReviewPage = () => {",
      "  const query = useQuery({ queryFn: saveReview })",
      "  return <SaveButton onSave={saveReview} />",
      "}",
    ),
    "schema.prisma": "model Review {}",
  },
  { "src/review-page.tsx": [rangeAt(3, 26, 3, 31)] },
)

const linked = (): ASTCodeGroupGraph => linkCodeGroupGraph(STORED)

const blockOf = (group: ASTCodeGroupGraph, type: CodeBlock["type"], name: string): CodeBlock => {
  const block = group.codeBlocks.find((candidate) => candidate.type === type && candidate.name === name)
  if (block === undefined) throw new Error(`There is no ${type} block named ${name}.`)
  return block
}

describe("a group in memory", () => {
  it("is turned back into the stored form it was linked from", () => {
    expect(storeCodeGroupGraph(linked())).toStrictEqual(STORED)
  })

  it("is written as JSON in its stored form, with every reference as an id or a file path", () => {
    expect(JSON.parse(JSON.stringify(STORED))).toStrictEqual(STORED)
  })

  it("holds every block once: the lists of the group and of a file hold the same objects", () => {
    const group = linked()
    const [buttonGraph, pageGraph] = group.astGraphs

    expect(group.codeBlocks.filter((block) => block.astGraph === pageGraph)).toStrictEqual([...pageGraph.codeBlocks])
    expect(pageGraph.rootBlocks.every((block) => group.codeBlocks.includes(block) && block.isRoot)).toBe(true)
    expect(pageGraph.renderRootBlocks?.map((block) => block.type)).toStrictEqual(["render-root"])
    expect(buttonGraph.exports.get("SaveButton")).toBe(blockOf(group, "component", "SaveButton"))
    expect(buttonGraph.exports.get("LIMIT")).toBe(blockOf(group, "root-variable", "LIMIT"))
  })

  it("leads from a block to its parent, its children and its file, and back", () => {
    const group = linked()
    const page = blockOf(group, "component", "ReviewPage")
    const [query] = page.childrenBlocks

    expect(query.parentBlock).toBe(page)
    expect(page.parentBlock).toBeNull()
    expect(page.astGraph).toBe(group.astGraphs[1])
    expect(page.exportedBy).toStrictEqual([group.astGraphs[1]])
    expect(page.childrenBlocks).toBe(page.childrenBlocks)
  })

  it("leads from a symbol to the block it names, and from that block to the blocks that use it", () => {
    const group = linked()
    const saveReview = blockOf(group, "function", "saveReview")
    const limit = blockOf(group, "root-variable", "LIMIT")
    const [symbol] = saveReview.outerSymbols

    expect(symbol.type === "external-block" && symbol.codeBlockReference).toBe(limit)
    expect(limit.usedBy).toStrictEqual([saveReview])
    expect(group.astGraphs[1].externalSymbols).toContain(symbol)
    expect(group.astGraphs[1].externalBlocks).toStrictEqual([limit, blockOf(group, "component", "SaveButton")])
  })

  it("leads from a handed-over value to the block that receives it, and back", () => {
    const group = linked()
    const argument = blockOf(group, "root-argument-value", "onSave")
    const event = blockOf(group, "render-event", "onSave")

    expect(event.outerSymbols[0].handedTo).toBe(argument)
    expect(argument.handedFrom).toStrictEqual([event.outerSymbols[0]])
    expect(argument.handedFrom[0]).toBe(event.outerSymbols[0])
  })

  it("lists the files no other file of the group imports, and the changed blocks", () => {
    const group = linked()

    expect(group.rootASTGraphs.map((astGraph) => astGraph.filePath)).toStrictEqual(["src/review-page.tsx", "schema.prisma"])
    expect(group.diffBlocks).toStrictEqual([blockOf(group, "function", "saveReview")])
    expect(group.astGraphs[1].diffBlocks).toStrictEqual([...group.diffBlocks])
    expect(group.diffBlocks[0].lineOfCodeDiffs).toStrictEqual([rangeAt(3, 26, 3, 31)])
    expect(group.diffContains).toStrictEqual(["logic"])
  })

  it("has no render-root list on a file without markup, and no catalogue on any block", () => {
    const group = linked()

    expect(group.astGraphs[2].renderRootBlocks).toBeUndefined()
    expect(group.codeBlocks.every((block) => block.catalogue === null)).toBe(true)
  })

  it("refuses a stored form that names a block the group does not hold", () => {
    const broken = { ...STORED, diffBlockIds: ["src/missing.ts#function@1:1"] }

    expect(() => linkCodeGroupGraph(broken)).toThrow("The group holds nothing under src/missing.ts#function@1:1.")
  })
})
