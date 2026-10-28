import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { buildTrace } from "@/trace/build"
import { listTraceNodes } from "@/trace-diagram"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import { linkTraceDiagram, storeTraceDiagram } from "@/trace-diagram/stored"
import type { TraceDiagram, TraceDiagramView, TraceNode, TraceNodeView } from "@flightplan/configurations"

const CLIENT = codeOf(
  "export class TrainerClient {",
  "  load(id) { return { id, name: \"Red\" } }",
  "  save(trainer) { return trainer }",
  "}",
)
const NOTIFIER = codeOf(
  "export const createNotifier = (log) => {",
  "  const notify = (line) => log(line)",
  "  return { notify }",
  "}",
)
const NAMES = codeOf("export const normalizeName = (name) => name.trim()")
const RENAME_ALL = codeOf(
  "import { TrainerClient } from \"./client\"",
  "import { createNotifier } from \"./notifier\"",
  "import { normalizeName } from \"./names\"",
  "export const renameAll = (renames, log) => {",
  "  const client = new TrainerClient()",
  "  const { notify } = createNotifier(log)",
  "  let renamed = 0",
  "  for (const { id, name } of renames) {",
  "    const trainer = client.load(id)",
  "    if (!trainer) throw new Error(\"No trainer\")",
  "    if (trainer.name === name) {",
  "      notify(name)",
  "      continue",
  "    }",
  "    client.save({ ...trainer, name: normalizeName(name) })",
  "    notify(trainer.name)",
  "    log(name.length)",
  "    renamed += 1",
  "  }",
  "  return renamed",
  "}",
)
const MAIN = codeOf("import { renameAll } from \"./rename-all\"", "export const main = () => renameAll([], console.log)")
const FILES = { "src/client.ts": CLIENT, "src/notifier.ts": NOTIFIER, "src/names.ts": NAMES, "src/rename-all.ts": RENAME_ALL, "src/main.ts": MAIN }
const CHANGE = {
  "src/rename-all.ts": [rangeAt(4, 1, 21, 2)],
  "src/client.ts": [rangeAt(2, 3, 3, 35)],
  "src/notifier.ts": [rangeAt(2, 3, 2, 37)],
  "src/names.ts": [rangeAt(1, 1, 1, 51)],
}

const RENAME_ALL_ID = "src/rename-all.ts#function@4:1"

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const viewOf = (traceDiagram: TraceDiagram): TraceDiagramView | null => buildTrace(createSegment({ traceDiagram }), "", [], createViewContext()).diagram

const CONTEXT_MARK = " "

const viewWithSources = (traceDiagram: TraceDiagram, files: Readonly<Record<string, string>>, language: string): TraceDiagramView | null => {
  const sources = Object.entries(files).map(([path, text]) => highlightPlainly(parseMarkedSource(path, language, text.split("\n").map((line) => `${CONTEXT_MARK}${line}`).join("\n"))))
  return buildTrace(createSegment({ traceDiagram }), "", [], { ...createViewContext(), sources }).diagram
}

const throwNamesOf = (view: TraceDiagramView | null, nodeId: string): string[] =>
  (listNodeViews(view?.nodes ?? []).find((node) => node.id === nodeId)?.blockLists.find(({ kind }) => kind === "throw")?.blocks ?? []).map(({ name }) => name)

const nodeViewOf = (view: TraceDiagramView | null): TraceNodeView | undefined => listNodeViews(view?.nodes ?? []).find((node) => node.id === RENAME_ALL_ID)

const nameById = (node: TraceNodeView | undefined): ReadonlyMap<string, string> =>
  new Map((node?.blockLists ?? []).flatMap(({ blocks }) => blocks).map((row) => [row.id, row.name] as const))

const groupsOf = (node: TraceNodeView | undefined): [string | null, string[]][] =>
  (node?.rowGroups ?? []).map(({ label, rowIds }) => [label, rowIds.map((rowId) => nameById(node).get(rowId) ?? rowId)])

const calleeCardsOf = (node: TraceNodeView | undefined): [string, string, string, string | null, string[]][] =>
  (node?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, type, typeLabel, changedLabel, rowIds }) => [name, type, typeLabel, changedLabel, rowIds.map((rowId) => nameById(node).get(rowId) ?? rowId)])

const renameAllOf = (diagram: TraceDiagram): TraceNode | undefined => listTraceNodes(diagram.traceNodes).find((node) => node.id === RENAME_ALL_ID)

const withNode = (diagram: TraceDiagram, change: (node: TraceNode) => TraceNode): TraceDiagram => ({
  ...diagram,
  traceNodes: diagram.traceNodes.map((node) => (node.id === RENAME_ALL_ID ? change(node) : node)),
})

describe("the rows of a function card", () => {
  it("lists its arguments, then its calls out in a card of each callee, then its raises and returns", () => {
    const node = nodeViewOf(viewOf(presentDiagramOf(FILES, CHANGE)))

    expect(node?.parameters).toStrictEqual([])
    expect(groupsOf(node)).toStrictEqual([["Arguments", ["renames", "log"]], ["External calls", []], ["Returns and raises", ["Throw :10", "return"]]])
  })

  it("groups a call by what it calls: a class with its methods called on an instance, a function with the functions it returns, and an argument handed in", () => {
    expect(calleeCardsOf(nodeViewOf(viewOf(presentDiagramOf(FILES, CHANGE))))).toStrictEqual([
      ["TrainerClient", "class", "Class", "Modified", ["TrainerClient()", "client.load()", "client.save()"]],
      ["createNotifier", "function", "Function", "Modified", ["createNotifier()", "notify()", "notify()"]],
      ["normalizeName", "function", "Function", "Modified", ["normalizeName()"]],
      ["log", "root-argument-value", "Argument", null, ["log()"]],
    ])
  })

  it("draws the line to what a call leads to from the row of that call", () => {
    const edges = viewOf(presentDiagramOf(FILES, CHANGE))?.edges.filter((edge) => edge.from === RENAME_ALL_ID) ?? []

    expect(edges.map(({ fromRowId, to }) => [fromRowId, to])).toStrictEqual([
      ["src/rename-all.ts#external-value@5:3@5:22", "src/client.ts#class@1:1"],
      ["src/rename-all.ts#variable@9:5@9:21", "src/client.ts#method@2:3"],
      ["src/rename-all.ts#property@15:31@15:37", "src/names.ts#function@1:1"],
      ["src/rename-all.ts#call@15:5@15:5", "src/client.ts#method@3:3"],
      ["src/rename-all.ts#call@12:7@12:7", "src/notifier.ts#function@1:1"],
      ["src/rename-all.ts#call@16:5@16:5", "src/notifier.ts#function@1:1"],
    ])
  })

  it("asks a label for each call, each raise and each return, keyed by where the call or the return is, and shows the label written for it", () => {
    const diagram = presentDiagramOf(FILES, CHANGE)
    const labels = renameAllOf(diagram)?.blockLabels ?? []
    const written = withNode(diagram, (node) => ({ ...node, blockLabels: node.blockLabels.map((listed) => (listed.at?.line === 12 ? { ...listed, label: "Logs a trainer that keeps the name" } : listed)) }))
    const shown = (nodeViewOf(viewOf(written))?.blockLists ?? []).flatMap(({ blocks }) => blocks).filter((row) => row.label === "Logs a trainer that keeps the name")

    expect(labels.map(({ codeBlock, at }) => [codeBlock.type, at?.line ?? null])).toStrictEqual([
      ["external-value", 5],
      ["external-value", 6],
      ["variable", 9],
      ["throw", null],
      ["call", 12],
      ["call", 15],
      ["property", 15],
      ["call", 16],
      ["call", 17],
      ["function", 20],
    ])
    expect(shown.map(({ id, isDraft }) => [id, isDraft])).toStrictEqual([["src/rename-all.ts#call@12:7@12:7", false]])
  })

  it("keeps where a call is when the diagram is stored and linked again", () => {
    const diagram = presentDiagramOf(FILES, CHANGE)
    const linked = linkTraceDiagram(storeTraceDiagram(diagram), diagram.astCodeGroup, diagram.importGraphGroup)

    expect(renameAllOf(linked)?.blockLabels.map(({ at }) => at)).toStrictEqual(renameAllOf(diagram)?.blockLabels.map(({ at }) => at))
  })

  it("lists the early return in a condition and the last return of a TypeScript function as rows of their own, keyed by where each is", () => {
    const files = {
      "src/names.ts": codeOf("export const normalizeName = (name) => name.trim()"),
      "src/rename.ts": codeOf("import { normalizeName } from \"./names\"", "export const renameOne = (name) => {", "  if (!name) {", "    return null", "  }", "  return normalizeName(name)", "}"),
      "src/main.ts": codeOf("import { renameOne } from \"./rename\"", "export const main = () => renameOne(\"a\")"),
    }
    const traceDiagram = presentDiagramOf(files, { "src/rename.ts": [rangeAt(3, 1, 6, 29)], "src/names.ts": [rangeAt(1, 1, 1, 51)] })
    const node = listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((one) => one.id === "src/rename.ts#function@2:1")

    expect(node?.rowGroups.slice(-1)).toStrictEqual([{
      label: "Returns and raises",
      rowIds: ["src/rename.ts#condition@3:3@4:5", "src/rename.ts#function@2:1@6:3"],
      childIds: [],
    }])
    expect(node?.blockLists.find(({ kind }) => kind === "return")?.blocks.map(({ name, lines }) => [name, lines])).toStrictEqual([["return", [[4, 4]]], ["return", [[6, 6]]]])
  })

  it("lists the early return in a condition and the last return of a Python function as rows of their own, keyed by where each is", () => {
    const files = {
      "shop/names.py": codeOf("def normalize_name(name):", "    return name.strip()"),
      "shop/rename.py": codeOf("from shop.names import normalize_name", "def rename_one(name):", "    if not name:", "        return None", "    return normalize_name(name)"),
      "shop/main.py": codeOf("from shop.rename import rename_one", "def main():", "    return rename_one(\"a\")"),
    }
    const traceDiagram = presentDiagramOf(files, { "shop/rename.py": [rangeAt(3, 1, 5, 32)], "shop/names.py": [rangeAt(2, 5, 2, 24)] })
    const node = listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((one) => one.id === "shop/rename.py#function@2:1")
    const labels = listTraceNodes(traceDiagram.traceNodes).find((one) => one.id === "shop/rename.py#function@2:1")?.blockLabels ?? []

    expect(node?.rowGroups.slice(-1).map(({ rowIds }) => rowIds)).toStrictEqual([["shop/rename.py#condition@3:5@4:9", "shop/rename.py#function@2:1@5:5"]])
    expect(labels.map(({ codeBlock, at }) => [codeBlock.id, at ?? null])).toStrictEqual([
      ["shop/rename.py#condition@3:5", { line: 4, column: 9 }],
      ["shop/rename.py#function@2:1", { line: 5, column: 5 }],
      ["shop/rename.py#function@2:1", { line: 5, column: 12 }],
    ])
  })

  it("gives a hook the rows of a function card: a call of a hook of the repository in a Hook card, and no row for a hook of a library", () => {
    const files = {
      "src/use-totals.ts": codeOf("export const useTotals = (items) => {", "  return items.length", "}"),
      "src/use-cart.ts": codeOf(
        "import { useState } from \"react\"",
        "import { useTotals } from \"./use-totals\"",
        "export const useCart = () => {",
        "  const [items] = useState([])",
        "  const total = useTotals(items)",
        "  return { items, total }",
        "}",
      ),
      "src/cart.tsx": codeOf("import { useCart } from \"./use-cart\"", "export const Cart = () => {", "  const { total } = useCart()", "  return <p>{total}</p>", "}"),
    }
    const traceDiagram = presentDiagramOf(files, { "src/use-totals.ts": [rangeAt(2, 3, 2, 23)] })
    const hook = listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((node) => node.id === "src/use-cart.ts#hook@3:1")

    expect(hook?.rowGroups.map(({ label }) => label)).toStrictEqual(["External calls", "Returns and raises"])
    expect(hook?.rowGroups.flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, typeLabel, rowIds }) => [name, typeLabel, rowIds])).toStrictEqual([
      ["useTotals", "Hook", ["src/use-cart.ts#external-value@5:3@5:17"]],
    ])
  })

  it("names a TypeScript throw after the start of its statement, up to its arguments", () => {
    const files = {
      "src/checks.ts": codeOf(
        "export const check = (name, error) => {",
        "  if (!name) throw new Error(\"no name\")",
        "  if (name.length > 9) throw new RangeError(\"too long\")",
        "  if (error) throw error",
        "  return name",
        "}",
      ),
      "src/main.ts": codeOf("import { check } from \"./checks\"", "export const main = () => check(\"a\", null)"),
    }
    const traceDiagram = presentDiagramOf(files, { "src/checks.ts": [rangeAt(2, 3, 4, 24)] })

    expect(throwNamesOf(viewWithSources(traceDiagram, files, "typescript"), "src/checks.ts#function@1:1")).toStrictEqual(["throw new Error", "throw new RangeError", "throw error"])
  })

  it("names a Python raise after the start of its statement, without its arguments or the error it is raised from", () => {
    const files = {
      "shop/checks.py": codeOf(
        "def check(name):",
        "    if not name:",
        "        raise ValueError(\"no name\")",
        "    try:",
        "        return name.strip()",
        "    except AttributeError as error:",
        "        if len(name) > 9:",
        "            raise RuntimeError(\"long\") from error",
        "        raise",
      ),
      "shop/main.py": codeOf("from shop.checks import check", "def main():", "    return check(\"a\")"),
    }
    const traceDiagram = presentDiagramOf(files, { "shop/checks.py": [rangeAt(2, 5, 9, 14)] })

    expect(throwNamesOf(viewWithSources(traceDiagram, files, "python"), "shop/checks.py#function@1:1")).toStrictEqual(["raise ValueError", "raise RuntimeError", "raise"])
  })

  it("gives no row to a call of the card's own class through this, nor to an argument handed to that call, and keeps a call through this to another class", () => {
    const files = {
      "src/roster.ts": codeOf("export class Roster {", "  levelUp(trainer) {", "    return trainer", "  }", "}"),
      "src/trainers.ts": codeOf(
        "import { Roster } from \"./roster\"",
        "export class TrainersService {",
        "  constructor(private readonly roster: Roster) {}",
        "  find(trainerId) {",
        "    return { id: trainerId }",
        "  }",
        "  awardBadge(trainerId) {",
        "    const trainer = this.find(trainerId)",
        "    return this.roster.levelUp(trainer)",
        "  }",
        "}",
      ),
      "src/main.ts": codeOf("import { Roster } from \"./roster\"", "import { TrainersService } from \"./trainers\"", "export const main = () => new TrainersService(new Roster()).awardBadge(1)"),
    }
    const traceDiagram = presentDiagramOf(files, { "src/roster.ts": [rangeAt(3, 5, 3, 19)], "src/trainers.ts": [rangeAt(8, 5, 8, 41)] })
    const award = listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((node) => node.id === "src/trainers.ts#method@7:3")

    expect(award?.rowGroups.flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, typeLabel, rowIds }) => [name, typeLabel, rowIds.length])).toStrictEqual([["Roster", "Class", 1]])
  })

  it("gives no row to an argument a collection method is handed, though that method runs it in place", () => {
    const files = {
      "src/pick.ts": codeOf("export const pick = (pokemon, pokemonId) => {", "  const found = pokemon.find(pokemonId)", "  return found", "}"),
      "src/main.ts": codeOf("import { pick } from \"./pick\"", "export const main = () => pick([], 1)"),
    }
    const traceDiagram = presentDiagramOf(files, { "src/pick.ts": [rangeAt(2, 3, 2, 41)] })
    const pick = listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((node) => node.id === "src/pick.ts#function@1:1")

    expect(pick?.rowGroups.flatMap(({ calleeCards }) => calleeCards ?? [])).toStrictEqual([])
  })

  it("gives no row to the error a TypeScript throw or a Python raise makes, though its class is of the repository", () => {
    const typescript = {
      "src/errors.ts": codeOf("export class PartyFullError extends Error {}"),
      "src/party.ts": codeOf(
        "import { PartyFullError } from \"./errors\"",
        "import { save } from \"./store\"",
        "export const join = (party) => {",
        "  if (party.isFull) throw new PartyFullError(party.id)",
        "  return save(party)",
        "}",
      ),
      "src/store.ts": codeOf("export const save = (party) => party"),
      "src/main.ts": codeOf("import { join } from \"./party\"", "export const main = () => join({})"),
    }
    const python = {
      "shop/errors.py": codeOf("class NotFoundError(Exception):", "    pass"),
      "shop/store.py": codeOf("def save(party):", "    return party"),
      "shop/party.py": codeOf(
        "from shop.errors import NotFoundError",
        "from shop.store import save",
        "def join(party):",
        "    if party is None:",
        "        raise NotFoundError(\"no party\")",
        "    return save(party)",
      ),
      "shop/main.py": codeOf("from shop.party import join", "def main():", "    return join(None)"),
    }
    const calleesOf = (traceDiagram: TraceDiagram, nodeId: string): string[] =>
      (listNodeViews(viewOf(traceDiagram)?.nodes ?? []).find((node) => node.id === nodeId)?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name }) => name)

    expect(calleesOf(presentDiagramOf(typescript, { "src/party.ts": [rangeAt(4, 3, 5, 20)], "src/store.ts": [rangeAt(1, 1, 1, 38)] }), "src/party.ts#function@3:1")).toStrictEqual(["save"])
    expect(calleesOf(presentDiagramOf(python, { "shop/party.py": [rangeAt(4, 5, 6, 23)], "shop/store.py": [rangeAt(2, 5, 2, 17)] }), "shop/party.py#function@3:1")).toStrictEqual(["save"])
  })
})
