import { codeOf, rangeAt, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { presentDiagramOf } from "./diagram-fixture"

const CHAIN_LENGTH = 20
const LAST = CHAIN_LENGTH - 1

const valueAt = (position: number): string => `v${String(position)}`

const fileAt = (position: number): string => `f${String(position)}`

const linkOf = (position: number): string =>
  position === 0
    ? codeOf(`export const ${valueAt(0)} = Math.random()`)
    : codeOf(`import { ${valueAt(position - 1)} } from "./${fileAt(position - 1)}"`, `export const ${valueAt(position)} = ${valueAt(position - 1)} + 1`)

const chainFiles = (): FixtureFiles => ({
  ...Object.fromEntries(Array.from({ length: CHAIN_LENGTH }, (_, position) => [`src/${fileAt(position)}.ts`, linkOf(position)])),
  "src/main.ts": codeOf(`import { ${valueAt(LAST)} } from "./${fileAt(LAST)}"`, "export const main = () => {", `  return ${valueAt(LAST)}`, "}"),
})

describe("chains of folded values", () => {
  it("folds every value of a chain into the function that reads its end, nearest value first", () => {
    const diagram = presentDiagramOf(chainFiles(), { "src/f0.ts": [rangeAt(1, 1, 1, 33)] })
    const foldedNames = Array.from({ length: LAST }, (_, position) => valueAt(LAST - position))

    expect(diagram.traceNodes.map((node) => node.codeBlocks.map((block) => block.name))).toStrictEqual([["main", ...foldedNames], [valueAt(0)]])
  })
})
