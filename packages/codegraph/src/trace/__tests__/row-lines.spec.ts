import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { SourceRange } from "@/code-blocks/types"
import { buildTrace } from "@/trace/build"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceDiagramView, TraceNodeView } from "@flightplan/configurations"

const LINE_BREAK = "\n"
const ADDED_MARK = "+"

const addedOf = (files: FixtureFiles): FixtureDiffs =>
  Object.fromEntries(Object.entries(files).map(([path, text]): [string, readonly SourceRange[]] => [path, [rangeAt(1, 1, text.split(LINE_BREAK).length, 2)]]))

const languageOf = (path: string): string => {
  if (path.endsWith(".vue")) return "vue"
  return path.endsWith(".py") ? "python" : "typescript"
}

const viewOf = (files: FixtureFiles): TraceDiagramView | null => {
  const sources = Object.entries(files).map(([path, text]) => highlightPlainly(parseMarkedSource(path, languageOf(path), text.split(LINE_BREAK).map((line) => `${ADDED_MARK}${line}`).join(LINE_BREAK))))
  return buildTrace(createSegment({ traceDiagram: presentDiagramOf(files, addedOf(files)) }), "", [], { ...createViewContext(), sources }).diagram
}

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const linesFrom = (view: TraceDiagramView | null, nodeId: string): [string | null, string, string | null][] =>
  (view?.edges ?? []).filter((edge) => edge.from === nodeId).map(({ fromRowId, to, toRowId }) => [fromRowId, to, toRowId])

const calleeCardsOf = (view: TraceDiagramView | null, nodeId: string): [string, string[]][] => {
  const node = listNodeViews(view?.nodes ?? []).find((one) => one.id === nodeId)
  const nameById = new Map((node?.blockLists ?? []).flatMap(({ blocks }) => blocks).map((row) => [row.id, row.name] as const))
  return (node?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, rowIds }) => [name, rowIds.map((rowId) => nameById.get(rowId) ?? rowId)])
}

describe("a line that leaves through a parameter", () => {
  it("leaves the row of that argument, never a call row of the function", () => {
    const files: FixtureFiles = {
      "app/models.py": codeOf("from pydantic import BaseModel", "class PokemonDraft(BaseModel):", "    name: str"),
      "app/auth.py": codeOf("def current_trainer():", "    return 1"),
      "app/store.py": codeOf("def save_pokemon(draft, trainer):", "    return draft"),
      "app/routes.py": codeOf(
        "from fastapi import APIRouter, Depends",
        "from app.models import PokemonDraft",
        "from app.auth import current_trainer",
        "from app.store import save_pokemon",
        "router = APIRouter()",
        "@router.post(\"/api/pokemon\")",
        "def catch_pokemon(draft: PokemonDraft, trainer=Depends(current_trainer)):",
        "    return save_pokemon(draft, trainer)",
      ),
    }

    expect(linesFrom(viewOf(files), "app/routes.py#function@6:1")).toStrictEqual([
      ["app/routes.py#function@6:1@8:12", "app/store.py#function@1:1", null],
      ["app/routes.py#root-argument-value@7:19", "app/models.py#class@2:1", null],
      ["app/routes.py#root-argument-value@7:40", "app/auth.py#function@1:1", null],
    ])
  })
})

describe("a call row", () => {
  it("carries no line to what another use on its block reaches, and a library method of a store gets no row", () => {
    const files: FixtureFiles = {
      "src/lib/lines.ts": codeOf("export const addLine = (lines, item) => [...lines, item]"),
      "src/bag.ts": codeOf("import { atom } from \"nanostores\"", "import { addLine } from \"./lib/lines\"", "export const $bag = atom([])", "export const addToBag = (item) => {", "  $bag.set(addLine($bag.get(), item))", "}"),
      "src/main.ts": codeOf("import { addToBag } from \"./bag\"", "export const main = () => addToBag(1)"),
    }
    const view = viewOf(files)

    expect(calleeCardsOf(view, "src/bag.ts#function@4:1")).toStrictEqual([["addLine", ["addLine()"]]])
    expect(linesFrom(view, "src/bag.ts#function@4:1").filter(([fromRowId]) => fromRowId !== null).map(([, to]) => to)).toStrictEqual(["src/lib/lines.ts#function@1:1"])
  })

  it("of a name destructured from useUnit reaches the unit at the same place, and the useUnit row reaches every unit", () => {
    const files: FixtureFiles = {
      "src/units.ts": codeOf("import { createEvent, createStore } from \"effector\"", "export const itemAdded = createEvent()", "export const bagCleared = createEvent()", "export const $bag = createStore([])"),
      "src/bag.tsx": codeOf(
        "import { useUnit } from \"effector-react\"",
        "import { $bag, bagCleared, itemAdded } from \"./units\"",
        "export const Bag = () => {",
        "  const [bag, addItem, clear] = useUnit([$bag, itemAdded, bagCleared])",
        "  return <p onClick={() => { clear(); addItem(1) }}>{bag}</p>",
        "}",
      ),
    }
    const view = viewOf(files)

    expect(linesFrom(view, "src/bag.tsx#render-event@5:13")).toStrictEqual([
      ["src/bag.tsx#call@5:39@5:39", "src/units.ts#root-variable@2:1", null],
      ["src/bag.tsx#call@5:30@5:30", "src/units.ts#root-variable@3:1", null],
    ])
    expect(linesFrom(view, "src/bag.tsx#component@3:1").filter(([fromRowId]) => fromRowId === "src/bag.tsx#state@4:3@4:33").map(([, to]) => to)).toStrictEqual([
      "src/units.ts#root-variable@2:1",
      "src/units.ts#root-variable@3:1",
    ])
  })
})

describe("the calls of an event", () => {
  it("include the calls of the function it is handed by name, and of a function its handler calls", () => {
    const files: FixtureFiles = {
      "src/sum.ts": codeOf("export const sumOf = (n) => n"),
      "src/BagSummary.vue": codeOf(
        "<script setup lang=\"ts\">",
        "import { sumOf } from \"./sum\"",
        "const emit = defineEmits<{ (event: \"clear\"): void }>()",
        "const askToEmpty = () => {",
        "  emit(\"clear\")",
        "  sumOf(1)",
        "}",
        "const pickTrainer = (id) => {",
        "  sumOf(id)",
        "}",
        "</script>",
        "<template>",
        "  <button @click=\"askToEmpty\">Empty</button>",
        "  <select @change=\"pickTrainer(1)\"></select>",
        "</template>",
      ),
      "src/main.ts": codeOf("import BagSummary from \"./BagSummary.vue\"", "export const main = () => BagSummary"),
    }
    const view = viewOf(files)

    expect(calleeCardsOf(view, "src/BagSummary.vue#render-event@13:11")).toStrictEqual([["onClear", ["emit()"]], ["sumOf", ["sumOf()"]]])
    expect(calleeCardsOf(view, "src/BagSummary.vue#render-event@14:11")).toStrictEqual([["sumOf", ["sumOf()"]], ["pickTrainer", ["pickTrainer()"]]])
  })
})

describe("a call of an action of a store", () => {
  it("is a row in the card of the store, from a value declared from the store hook or from the store itself, and its line reaches the row of the action", () => {
    const files: FixtureFiles = {
      "src/stores/bag.ts": codeOf("import { defineStore } from \"pinia\"", "export const useBagStore = defineStore(\"bag\", {", "  state: () => ({ items: [] }),", "  actions: {", "    clear() { this.items = [] },", "    addItem(item) { this.items.push(item) },", "  },", "})"),
      "src/Bag.vue": codeOf("<script setup lang=\"ts\">", "import { useBagStore } from \"./stores/bag\"", "const bag = useBagStore()", "const emptyBag = () => { bag.clear() }", "</script>", "<template>", "  <button @click=\"emptyBag\">Empty</button>", "  <button @click=\"bag.addItem(1)\">Add</button>", "</template>"),
      "src/party-slice.ts": codeOf("import { createSlice } from \"@reduxjs/toolkit\"", "export const partySlice = createSlice({", "  name: \"party\",", "  initialState: { members: [] },", "  reducers: {", "    removeMember: (state, action) => { state.members = [] },", "  },", "})"),
      "src/party.tsx": codeOf("import { useDispatch } from \"react-redux\"", "import { partySlice } from \"./party-slice\"", "export const Party = () => {", "  const dispatch = useDispatch()", "  return <button onClick={() => dispatch(partySlice.actions.removeMember(1))}>Remove</button>", "}"),
      "src/main.ts": codeOf("import Bag from \"./Bag.vue\"", "import { Party } from \"./party\"", "export const main = () => [Bag, Party]"),
    }
    const view = viewOf(files)

    expect(calleeCardsOf(view, "src/Bag.vue#render-event@7:11")).toStrictEqual([["useBagStore", ["bag.clear()"]]])
    expect(calleeCardsOf(view, "src/Bag.vue#render-event@8:11")).toStrictEqual([["useBagStore", ["bag.addItem()"]]])
    expect(calleeCardsOf(view, "src/party.tsx#render-event@5:18")).toStrictEqual([["partySlice", ["partySlice.actions.removeMember()"]]])
    expect(linesFrom(view, "src/Bag.vue#render-event@7:11")).toStrictEqual([["src/Bag.vue#call@4:26@4:26", "src/stores/bag.ts#state@2:1", "src/stores/bag.ts#function@5:5"]])
  })
})
