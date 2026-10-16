import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { nameOfBlock } from "@/journey/names"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const SAVE = codeOf(
  "export const createSaveHandler = (userId) => {",
  "  const key = keyOf(userId)",
  "  return (draft) => {",
  "    if (!draft.name) throw new Error(\"no name\")",
  "    save(key, draft)",
  "  }",
  "}",
)

describe("the card of a function that returns a function", () => {
  it("makes a node of the returned function, drawn inside the node of the function that returns it", () => {
    const diagram = presentDiagramOf({ "src/save.ts": SAVE }, { "src/save.ts": [rangeAt(5, 5, 5, 21)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function createSaveHandler", "  function  (changed)"])
  })

  it("lists a parameter of the returned function as its argument", () => {
    const diagram = presentDiagramOf({ "src/save.ts": SAVE }, { "src/save.ts": [rangeAt(3, 11, 3, 16)] })
    const [, returned] = listJourneyNodes(diagram.journeyNodes)

    expect(returned.blockLabels.map(({ codeBlock }) => nameOfBlock(codeBlock))[0]).toBe("draft")
  })

  it("makes no node of a function a callback returns", () => {
    const files = {
      "src/panel.tsx": codeOf(
        "import { useEffect } from \"react\"",
        "export const Panel = () => {",
        "  useEffect(() => {",
        "    return () => stop()",
        "  }, [])",
        "  return <main />",
        "}",
      ),
    }
    const diagram = presentDiagramOf(files, { "src/panel.tsx": [rangeAt(4, 12, 4, 23)] })

    expect(listJourneyNodes(diagram.journeyNodes).every((node) => node.codeBlocks[0].isReturned !== true)).toBe(true)
  })
})

describe("the card of a Python decorator", () => {
  it("draws the wrapper a decorator returns inside the card of the decorator", () => {
    const logged = codeOf(
      "from functools import wraps",
      "def logged(func):",
      "    @wraps(func)",
      "    def wrapper(*args):",
      "        log(args)",
      "        return func(*args)",
      "    return wrapper",
    )
    const diagram = presentDiagramOf({ "shop/logged.py": logged }, { "shop/logged.py": [rangeAt(5, 9, 5, 18)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["function logged", "  function wrapper (changed)"])
  })
})
