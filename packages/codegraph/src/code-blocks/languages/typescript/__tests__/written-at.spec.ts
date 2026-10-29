import { parseWithGrammar, type GrammarId, type SyntaxNode } from "@/ast-graph/parser"
import { writtenAtOf } from "@/code-blocks/languages/typescript/written-at"

const DEEP_CALL_CHAIN = 4000
const DEEP_OBJECTS = 4000
const USED_NAME = "used"
const DEEP_SOURCE_TIMEOUT_MS = 30_000

const usedIn = (source: string, grammar: GrammarId = "typescript"): SyntaxNode | null =>
  parseWithGrammar(grammar, source).rootNode.descendantsOfType("identifier").find((name) => name.text === USED_NAME) ?? null

const slotIn = (source: string, grammar: GrammarId = "typescript") => {
  const used = usedIn(source, grammar)
  return used === null ? undefined : writtenAtOf(used).slot
}

describe("the slot a use is handed in", () => {
  it("is the place of the argument the use is, or is held in", () => {
    expect([
      slotIn(`handle(first, ${USED_NAME})`),
      slotIn(`handle([[${USED_NAME}]])`),
      slotIn(`handle(first, [[[[${USED_NAME}]]]])`),
      slotIn(`handle(${USED_NAME}.next().next())`),
    ]).toStrictEqual([1, 0, 1, 0])
  })

  it("is the name of the attribute the use is written in", () => {
    expect(slotIn(`const item = <Item onPick={[[[[${USED_NAME}]]]]} />`, "tsx")).toBe("onPick")
  })

  it("is no slot for a use a function returns, or a use written outside any call", () => {
    expect([slotIn(`const run = () => ${USED_NAME}`), slotIn(`const all = [[[[${USED_NAME}]]]]`), slotIn(`handle(() => [${USED_NAME}])`)]).toStrictEqual([null, null, null])
  })
})

describe("where a deeply nested use is written", () => {
  it("is the argument that holds a long chain of calls on it", () => {
    const used = usedIn(`handle(${USED_NAME}${".next()".repeat(DEEP_CALL_CHAIN)})`)

    expect(used === null ? null : writtenAtOf(used)).toStrictEqual({ slot: 0, keyPath: [], isSpread: false, isBase: false })
  }, DEEP_SOURCE_TIMEOUT_MS)

  it("is the path of keys through many nested objects", () => {
    const used = usedIn(`const options = ${"{ inner: ".repeat(DEEP_OBJECTS)}{ last: ${USED_NAME} }${" }".repeat(DEEP_OBJECTS)}`)

    expect(used === null ? null : writtenAtOf(used)).toStrictEqual({ slot: null, keyPath: [...Array.from({ length: DEEP_OBJECTS }, () => "inner"), "last"], isSpread: false, isBase: false })
  }, DEEP_SOURCE_TIMEOUT_MS)
})
