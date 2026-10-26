import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const reader = (name: string): string => codeOf(`import { ${name} } from "./values"`, "export const read = () => {", `  return ${name}`, "}")

const MAIN = codeOf("import { read } from \"./read\"", "export const main = () => {", "  return read()", "}")

const outlineOfValue = (value: string, name: string): string[] =>
  outlineOfNodes(
    presentDiagramOf({ "src/values.ts": codeOf(value), "src/read.ts": reader(name), "src/main.ts": MAIN }, { "src/values.ts": [rangeAt(1, 1, 1, value.length + 1)] }),
  )

describe("plain code at the top level of a file", () => {
  it("gives an exported value written out as it is no node", () => {
    expect(outlineOfValue("export const LIMITS = { page: [10, 20], max: 100 }", "LIMITS")).toStrictEqual(["function main", "function read (changed)"])
    expect(outlineOfValue("export const cache = new Map()", "cache")).toStrictEqual(["function main", "function read (changed)"])
  })

  it("keeps a node for an exported value with a call or a function inside it", () => {
    expect(outlineOfValue("export const config = { key: getKey() }", "config")).toContain("root-variable config (changed)")
    expect(outlineOfValue("export const handlers = { save: () => 1 }", "handlers")).toContain("root-variable handlers (changed)")
  })

  it("keeps a node for new of a class of the repository with a method", () => {
    const files = {
      "src/store.ts": codeOf("export class CartStore {", "  add(item) { return item }", "}"),
      "src/values.ts": codeOf("import { CartStore } from \"./store\"", "export const cart = new CartStore()"),
      "src/read.ts": reader("cart"),
    }
    const diagram = presentDiagramOf(files, { "src/values.ts": [rangeAt(2, 1, 2, 37)] })

    expect(outlineOfNodes(diagram)).toContain("root-variable cart (changed)")
  })
})
