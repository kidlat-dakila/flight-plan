import { codeOf, rangeAt, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { presentDiagramOf } from "./diagram-fixture"

const SETUP_FILE = "src/setup.ts"
const MAIN = codeOf("import { setup } from \"./setup\"", "export const main = () => setup(1)")

const handlerHanding = (name: string, handed: string): string => `  const ${name} = () => { socket.subscribe({ onMessage: ${handed} }) }`

const FIRST_HANDLER_LINE = 2

const filesOf = (handlers: readonly string[]): FixtureFiles => ({
  [SETUP_FILE]: codeOf("export function setup(socket) {", ...handlers, "  open()", "}"),
  "src/main.ts": MAIN,
})

const functionNamesOfNodes = (handlers: readonly string[]): (string | undefined)[][] =>
  presentDiagramOf(filesOf(handlers), { [SETUP_FILE]: [rangeAt(FIRST_HANDLER_LINE, 1, FIRST_HANDLER_LINE + handlers.length - 1, 20)] }).traceNodes.map((node) =>
    node.codeBlocks.filter((block) => block.type === "function").map((block) => block.name))

describe("handlers handed to events inside each other", () => {
  it("keeps two handlers that hand each other to events in the function around them", () => {
    const handlers = [handlerHanding("open", "close"), handlerHanding("close", "open")]

    expect(functionNamesOfNodes(handlers)).toStrictEqual([["setup", "open", "close"], ["main"]])
  })

  it("keeps a ring of three handlers in the function around them", () => {
    const handlers = [handlerHanding("open", "pause"), handlerHanding("pause", "close"), handlerHanding("close", "open")]

    expect(functionNamesOfNodes(handlers)).toStrictEqual([["setup", "open", "pause", "close"], ["main"]])
  })
})
