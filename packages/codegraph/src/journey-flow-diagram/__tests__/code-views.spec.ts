import { codeViewsOf, journeyOf, returnCodeViewsOf, type Repository } from "./journey-repository"

const STORE: Repository = {
  "src/statuses.ts": ["export const STATUSES = [", "  \"open\",", "]"],
  "src/store.ts": ["export const useStore = (pick: (state: { status: string }) => string) =>", "  pick({ status: \"open\" }) // diff"],
  "src/Filter.tsx": [
    "import { STATUSES } from \"./statuses\"",
    "import { useStore } from \"./store\"",
    "",
    "export function Filter() {",
    "  const status = useStore((state) => state.status)",
    "  const handleReset = () => {",
    "    console.log(status)",
    "  }",
    "  if (status === \"\") return <p>None</p>",
    "  return (",
    "    <nav>",
    "      <button onClick={handleReset} onKeyDown={() => useStore((state) => state.status)}>",
    "        {status}",
    "      </button>",
    "      {STATUSES.map((option) => (",
    "        <span key={option}>{option}</span>",
    "      ))}",
    "    </nav>",
    "  )",
    "}",
  ],
}

describe("the code views of a journey node", () => {
  it("shows a node that is not a component by its whole root encapsulation", () => {
    expect(codeViewsOf(STORE, journeyOf(STORE), "useStore")).toStrictEqual(["declaration x1 | src/store.ts | 1-2"])
  })

  it("shows the data of a component where each value is declared, in its own file or another, with a mark on the name", () => {
    const views = codeViewsOf(STORE, journeyOf(STORE), "Filter")

    expect(views.filter((view) => view.startsWith("data"))).toStrictEqual([
      "data x1 | src/Filter.tsx | 5 | status",
      "data x1 | src/statuses.ts | 1-3",
    ])
  })

  it("shows the events of a component in one view, from the element to the attribute and with the handler it declares, and marks each attribute", () => {
    const views = codeViewsOf(STORE, journeyOf(STORE), "Filter")

    expect(views.filter((view) => view.startsWith("event"))).toStrictEqual([
      "event x2 | src/Filter.tsx | 6-8,12 | onClick={handleReset} | onKeyDown={() => useStore((state) => state.status)}",
    ])
  })

  it("shows the return statements of a component under Render, after its data and its events", () => {
    const views = codeViewsOf(STORE, journeyOf(STORE), "Filter")

    expect(views.map((view) => view.split(" ")[0])).toStrictEqual(["data", "data", "event", "render"])
    expect(views[views.length - 1]).toBe("render x2 | src/Filter.tsx | 9-19")
  })

  it("shows a return of a component by the data and the events on its lines, then that return", () => {
    expect(returnCodeViewsOf(STORE, journeyOf(STORE), "Filter")).toStrictEqual([
      ["render x1 | src/Filter.tsx | 9"],
      [
        "data x1 | src/Filter.tsx | 5 | status",
        "data x1 | src/statuses.ts | 1-3",
        "event x2 | src/Filter.tsx | 6-8,12 | onClick={handleReset} | onKeyDown={() => useStore((state) => state.status)}",
        "render x1 | src/Filter.tsx | 10-19",
      ],
    ])
  })

  it("shows a handler node by its element, its attribute and the handler it runs", () => {
    expect(codeViewsOf(STORE, journeyOf(STORE), "Filter.onKeyDown")).toStrictEqual([
      "event x1 | src/Filter.tsx | 12 | onKeyDown={() => useStore((state) => state.status)}",
    ])
  })
})
