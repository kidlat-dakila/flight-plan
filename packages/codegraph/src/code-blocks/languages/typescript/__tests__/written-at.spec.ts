import { parseWithGrammar, type SyntaxNode } from "@/ast-graph/parser"
import { writtenAtOf } from "@/code-blocks/languages/typescript/written-at"

const DEEP_CALL_CHAIN = 4000
const DEEP_OBJECTS = 4000
const USED_NAME = "used"

const usedIn = (source: string): SyntaxNode | null =>
  parseWithGrammar("typescript", source).rootNode.descendantsOfType("identifier").find((name) => name.text === USED_NAME) ?? null

describe("where a deeply nested use is written", () => {
  it("is the argument that holds a long chain of calls on it", () => {
    const used = usedIn(`handle(${USED_NAME}${".next()".repeat(DEEP_CALL_CHAIN)})`)

    expect(used === null ? null : writtenAtOf(used)).toStrictEqual({ slot: 0, keyPath: [], isSpread: false, isBase: false })
  })

  it("is the path of keys through many nested objects", () => {
    const used = usedIn(`const options = ${"{ inner: ".repeat(DEEP_OBJECTS)}{ last: ${USED_NAME} }${" }".repeat(DEEP_OBJECTS)}`)

    expect(used === null ? null : writtenAtOf(used)).toStrictEqual({ slot: null, keyPath: [...Array.from({ length: DEEP_OBJECTS }, () => "inner"), "last"], isSpread: false, isBase: false })
  })
})
