import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { SourceRange } from "@/code-blocks/types"
import { buildTrace } from "@/trace/build"
import { listTraceNodes } from "@/trace-diagram"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceDiagram, TraceDiagramView, TraceNodeView } from "@flightplan/configurations"

const LINE_BREAK = "\n"
const ADDED_MARK = "+"

const addedOf = (files: FixtureFiles): FixtureDiffs =>
  Object.fromEntries(Object.entries(files).map(([path, text]): [string, readonly SourceRange[]] => [path, [rangeAt(1, 1, text.split(LINE_BREAK).length, 2)]]))

const sourcesOf = (files: FixtureFiles): ReturnType<typeof highlightPlainly>[] =>
  Object.entries(files).map(([path, text]) => highlightPlainly(parseMarkedSource(path, "typescript", text.split(LINE_BREAK).map((line) => `${ADDED_MARK}${line}`).join(LINE_BREAK))))

const viewOf = (files: FixtureFiles, traceDiagram: TraceDiagram): TraceDiagramView | null =>
  buildTrace(createSegment({ traceDiagram }), "", [], { ...createViewContext(), sources: sourcesOf(files) }).diagram

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewOf = (view: TraceDiagramView | null, nodeId: string): TraceNodeView | undefined => listNodeViews(view?.nodes ?? []).find((node) => node.id === nodeId)

const calleeCardsOf = (node: TraceNodeView | undefined): [string, string, string[]][] => {
  const nameById = new Map((node?.blockLists ?? []).flatMap(({ blocks }) => blocks).map((row) => [row.id, row.name] as const))
  return (node?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? []).map(({ name, typeLabel, rowIds }) => [name, typeLabel, rowIds.map((rowId) => nameById.get(rowId) ?? rowId)])
}

const edgesFrom = (view: TraceDiagramView | null, nodeId: string): [string, string | null][] =>
  (view?.edges ?? []).filter((edge) => edge.from === nodeId).map(({ to, fromRowId }) => [to, fromRowId])

const STORE_FILES: FixtureFiles = {
  "src/bag-store.ts": codeOf(
    "import { create } from \"zustand\"",
    "export const selectCount = (state) => state.lines.length",
    "export const useBagStore = create<BagState>()((set) => ({",
    "  lines: [],",
    "  clear: () => set({ lines: [] }),",
    "}))",
  ),
  "src/xstate-bag.ts": codeOf("import { createStore } from \"@xstate/store\"", "export const bagStore = createStore({ context: { lines: [] }, on: {} })"),
  "src/items-page.tsx": codeOf(
    "import { useSelector } from \"@xstate/store/react\"",
    "import { selectCount, useBagStore } from \"./bag-store\"",
    "import { bagStore } from \"./xstate-bag\"",
    "export function ItemsPage() {",
    "  const count = useBagStore(selectCount)",
    "  const clear = useBagStore((state) => state.clear)",
    "  const lines = useSelector(bagStore, (snapshot) => snapshot.context.lines.length)",
    "  return <button onClick={() => clear()}>{count}{lines}</button>",
    "}",
  ),
}
const ITEMS_PAGE_ID = "src/items-page.tsx#component@4:1"
const BAG_STORE_ID = "src/bag-store.ts#state@3:1"

describe("a call of a store hook the repository declares", () => {
  it("is a call row in the card of the store, its selector folded into the row, with no effect and no callback card", () => {
    const diagram = presentDiagramOf(STORE_FILES, addedOf(STORE_FILES))
    const page = nodeViewOf(viewOf(STORE_FILES, diagram), ITEMS_PAGE_ID)

    expect(calleeCardsOf(page)).toStrictEqual([
      ["useBagStore", "State", ["useBagStore()", "useBagStore()"]],
      ["bagStore", "State", ["useSelector()"]],
    ])
    expect(page?.rowGroups.map(({ label }) => label)).not.toContain("Effects")
    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("effect-callback")
    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("component-effect")
  })

  it("leaves the line to the store from the row of the call, and an event that calls what the hook returned from its call row too", () => {
    const view = viewOf(STORE_FILES, presentDiagramOf(STORE_FILES, addedOf(STORE_FILES)))

    expect(edgesFrom(view, ITEMS_PAGE_ID)).toStrictEqual(expect.arrayContaining([
      [BAG_STORE_ID, "src/items-page.tsx#component-effect@5:17@5:17"],
      [BAG_STORE_ID, "src/items-page.tsx#component-effect@6:17@6:17"],
      ["src/xstate-bag.ts#state@2:1", "src/items-page.tsx#component-effect@7:17@7:17"],
    ]))
    expect(edgesFrom(view, "src/items-page.tsx#render-event@8:18").map(([to, fromRowId]) => [to, fromRowId === null])).toStrictEqual([[BAG_STORE_ID, false]])
  })
})

const REDUX_FILES: FixtureFiles = {
  "src/api.ts": codeOf(
    "import { createApi } from \"@reduxjs/toolkit/query/react\"",
    "export const todosApi = createApi({",
    "  endpoints: (builder) => ({",
    "    getTodos: builder.query({ query: () => \"todos\" }),",
    "  }),",
    "})",
    "export const { useGetTodosQuery } = todosApi",
  ),
  "src/slice.ts": codeOf("import { createAsyncThunk } from \"@reduxjs/toolkit\"", "export const loadParty = createAsyncThunk(\"party/load\", async () => [])"),
  "src/list.tsx": codeOf(
    "import { useEffect } from \"react\"",
    "import { useDispatch } from \"react-redux\"",
    "import { useGetTodosQuery } from \"./api\"",
    "import { loadParty } from \"./slice\"",
    "export const List = () => {",
    "  const dispatch = useDispatch()",
    "  const { data } = useGetTodosQuery()",
    "  useEffect(() => { dispatch(loadParty()) }, [dispatch])",
    "  return <ul>{data}</ul>",
    "}",
  ),
}

describe("a call of a hook of an RTK Query API", () => {
  it("is a call row in the card of the API, and the line to its endpoint leaves that row", () => {
    const view = viewOf(REDUX_FILES, presentDiagramOf(REDUX_FILES, addedOf(REDUX_FILES)))

    expect(calleeCardsOf(nodeViewOf(view, "src/list.tsx#component@5:1"))).toStrictEqual([["todosApi", "API", ["useGetTodosQuery()"]]])
    expect(edgesFrom(view, "src/list.tsx#component@5:1")).toContainEqual(["src/api.ts#property@4:5", "src/list.tsx#external-value@7:3@7:20"])
  })
})

describe("a thunk handed to dispatch", () => {
  it("is a call row of the effect in the card of the thunk, not an outside variable, and the line to the thunk leaves that row", () => {
    const view = viewOf(REDUX_FILES, presentDiagramOf(REDUX_FILES, addedOf(REDUX_FILES)))
    const effect = nodeViewOf(view, "src/list.tsx#component-effect@8:3")

    expect(calleeCardsOf(effect)).toStrictEqual([["loadParty", "Variable", ["loadParty()"]]])
    expect(effect?.blockLists.find(({ kind }) => kind === "outside-variable")).toBeUndefined()
    expect(edgesFrom(view, "src/list.tsx#component-effect@8:3")).toStrictEqual([["src/slice.ts#root-variable@2:1", "src/list.tsx#call@8:21@8:30"]])
  })
})

const TRPC_FILES: FixtureFiles = {
  "src/server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "export const t = initTRPC.create()"),
  "src/server/todos.ts": codeOf("export const saveTodo = (title) => {", "  return title.trim()", "}"),
  "src/server/todo-router.ts": codeOf(
    "import { t } from \"./trpc\"",
    "import { saveTodo } from \"./todos\"",
    "export const todoRouter = t.router({",
    "  create: t.procedure.mutation(({ input }) => saveTodo(input)),",
    "  list: t.procedure.query(() => []),",
    "})",
  ),
  "src/server/root.ts": codeOf(
    "import { t } from \"./trpc\"",
    "import { todoRouter } from \"./todo-router\"",
    "export const appRouter = t.router({ todo: todoRouter })",
    "export type AppRouter = typeof appRouter",
    "export const createCaller = t.createCallerFactory(appRouter)",
  ),
  "src/server/caller.ts": codeOf("import { createCaller } from \"./root\"", "export const caller = createCaller({})"),
  "src/client/trpc.ts": codeOf("import { createTRPCReact } from \"@trpc/react-query\"", "import type { AppRouter } from \"../server/root\"", "export const api = createTRPCReact<AppRouter>()"),
  "src/client/add-todo.tsx": codeOf("import { api } from \"./trpc\"", "export const AddTodo = () => {", "  const createTodo = api.todo.create.useMutation()", "  return <p>{createTodo.status}</p>", "}"),
  "src/app/todos-page.tsx": codeOf("import { caller } from \"../server/caller\"", "export default async function TodosPage() {", "  const todos = await caller.todo.list()", "  return <p>{todos}</p>", "}"),
}
const TRPC_CHANGE: FixtureDiffs = { "src/server/todos.ts": [rangeAt(2, 10, 2, 22)], "src/server/todo-router.ts": [rangeAt(5, 1, 5, 34)] }

describe("a call of a tRPC procedure", () => {
  it("is a call row in the card of the procedure it reaches, from a client hook and from a server caller, and the line to the procedure leaves that row", () => {
    const view = viewOf(TRPC_FILES, presentDiagramOf(TRPC_FILES, TRPC_CHANGE))

    expect(calleeCardsOf(nodeViewOf(view, "src/client/add-todo.tsx#component@2:1"))).toStrictEqual([["create", "Resolver", ["api.todo.create.useMutation()"]]])
    expect(calleeCardsOf(nodeViewOf(view, "src/app/todos-page.tsx#component@2:1"))).toStrictEqual([["list", "Resolver", ["caller.todo.list()"]]])
    expect(edgesFrom(view, "src/client/add-todo.tsx#component@2:1")).toStrictEqual([["src/server/todo-router.ts#resolver@4:11", "src/client/add-todo.tsx#request@3:22@3:22"]])
    expect(edgesFrom(view, "src/app/todos-page.tsx#component@2:1")).toStrictEqual([["src/server/todo-router.ts#resolver@5:9", "src/app/todos-page.tsx#external-value@3:3@3:23"]])
  })
})

describe("a destructured state", () => {
  it("shows every name it declares, as written", () => {
    const files: FixtureFiles = {
      "src/units.ts": codeOf("import { createEvent, createStore } from \"effector\"", "export const itemAdded = createEvent()", "export const bagCleared = createEvent()", "export const $bag = createStore([])"),
      "src/bag.tsx": codeOf(
        "import { useUnit } from \"effector-react\"",
        "import { $bag, bagCleared, itemAdded } from \"./units\"",
        "export const Bag = () => {",
        "  const [bag, addItem, clear] = useUnit([$bag, itemAdded, bagCleared])",
        "  const { total, add: addOne } = useUnit({ total: $bag, add: itemAdded })",
        "  return <p>{bag}{total}</p>",
        "}",
      ),
    }
    const states = nodeViewOf(viewOf(files, presentDiagramOf(files, addedOf(files))), "src/bag.tsx#component@3:1")?.blockLists.find(({ kind }) => kind === "state")?.blocks ?? []

    expect(states.map(({ name }) => name)).toStrictEqual([
      "[bag, addItem, clear] = useUnit([$bag, itemAdded, bagCleared])",
      "{ total, add: addOne } = useUnit({ total: $bag, add: itemAdded })",
    ])
  })
})

const outlineOf = (traceDiagram: TraceDiagram): string[] => listTraceNodes(traceDiagram.traceNodes).map((node) => node.id)

describe("a call that reaches no store, API, procedure or thunk of the repository", () => {
  it("gets no row: a method of a plain value, of a collection, of a library client, or of what a hook of the repository returned", () => {
    const files: FixtureFiles = {
      "src/db.ts": codeOf("import { drizzle } from \"drizzle-orm/node-postgres\"", "export const db = drizzle(\"url\")"),
      "src/party.ts": codeOf(
        "import { db } from \"./db\"",
        "const RESERVED_NAMES = [\"x\"]",
        "const tasks = new Map()",
        "export const removePokemon = (party, id) => {",
        "  tasks.set(id, 1)",
        "  db.update(id)",
        "  if (RESERVED_NAMES.includes(id)) return party",
        "  return party.filter((member) => member !== id)",
        "}",
      ),
      "src/use-trainer.ts": codeOf("export function useTrainer(id) {", "  return { team: [], name: \"\" }", "}"),
      "src/team-slot.tsx": codeOf("export const TeamSlot = ({ pokemon }) => <li>{pokemon}</li>"),
      "src/team-page.tsx": codeOf(
        "import { useTrainer } from \"./use-trainer\"",
        "import { TeamSlot } from \"./team-slot\"",
        "import { removePokemon } from \"./party\"",
        "export const TeamPage = ({ id }) => {",
        "  const trainer = useTrainer(id)",
        "  return <ul onClick={() => removePokemon(trainer.team, id)}>{trainer.team.map((pokemon) => <TeamSlot key={pokemon} pokemon={pokemon} />)}</ul>",
        "}",
      ),
    }
    const view = viewOf(files, presentDiagramOf(files, addedOf(files)))

    expect(calleeCardsOf(nodeViewOf(view, "src/party.ts#function@4:1"))).toStrictEqual([])
    expect(calleeCardsOf(nodeViewOf(view, "src/team-page.tsx#component@4:1"))).toStrictEqual([["useTrainer", "Hook", ["useTrainer()"]]])
  })

  it("keeps the node of a library call handed a function of the repository", () => {
    const files: FixtureFiles = {
      "src/routes.ts": codeOf("export const pokemonRoutes = async (app) => {", "  app.get(\"/pokemon\", async () => [])", "}"),
      "src/index.ts": codeOf("import Fastify from \"fastify\"", "import { pokemonRoutes } from \"./routes\"", "const app = Fastify()", "app.register(pokemonRoutes, { prefix: \"/api\" })"),
    }

    expect(outlineOf(presentDiagramOf(files, addedOf(files)))).toContain("src/index.ts#effect@4:1")
  })
})

describe("a call of a value a declaration outside the card holds", () => {
  it("gets no row from that declaration, and a method of a class of the repository called on a value keeps its row in the card of that class", () => {
    const files: FixtureFiles = {
      "src/data-source.ts": codeOf("import { DataSource } from \"typeorm\"", "export const dataSource = new DataSource({})"),
      "src/trainer.ts": codeOf("export class Trainer {", "  hasRoomInTeam() {", "    return true", "  }", "}"),
      "src/catch.ts": codeOf(
        "import { dataSource } from \"./data-source\"",
        "import { Trainer } from \"./trainer\"",
        "const trainers = dataSource.getRepository(Trainer)",
        "export const catchPokemon = async (id) => {",
        "  const trainer = new Trainer()",
        "  await trainers.findOne(id)",
        "  if (!trainer.hasRoomInTeam()) return null",
        "  return trainer",
        "}",
      ),
      "src/main.ts": codeOf("import { catchPokemon } from \"./catch\"", "export const main = () => catchPokemon(1)"),
    }
    const view = viewOf(files, presentDiagramOf(files, { ...addedOf(files), "src/trainer.ts": [rangeAt(3, 5, 3, 16)] }))

    expect(calleeCardsOf(nodeViewOf(view, "src/catch.ts#function@4:1"))).toStrictEqual([["Trainer", "Class", ["Trainer()", "trainer.hasRoomInTeam()"]]])
  })
})

describe("the lines of calls of stores and APIs", () => {
  it("draw one line per call, to the most specific row it reaches", () => {
    const view = viewOf(STORE_FILES, presentDiagramOf(STORE_FILES, addedOf(STORE_FILES)))
    const clearLines = (view?.edges ?? []).filter((edge) => edge.fromRowId === "src/items-page.tsx#component-effect@6:17@6:17")

    expect(clearLines.map(({ to, toRowId }) => [to, toRowId])).toStrictEqual([[BAG_STORE_ID, "src/bag-store.ts#function@5:3"]])
  })

  it("leave the row of each RTK Query hook for its own endpoint", () => {
    const files: FixtureFiles = {
      "src/api.ts": codeOf(
        "import { createApi } from \"@reduxjs/toolkit/query/react\"",
        "export const partyApi = createApi({",
        "  endpoints: (builder) => ({",
        "    getSuggestions: builder.query({ query: () => \"suggestions\" }),",
        "    saveParty: builder.mutation({ query: (party) => party }),",
        "  }),",
        "})",
        "export const { useGetSuggestionsQuery, useSavePartyMutation } = partyApi",
      ),
      "src/party.tsx": codeOf(
        "import { useGetSuggestionsQuery, useSavePartyMutation } from \"./api\"",
        "export const Party = () => {",
        "  const { data } = useGetSuggestionsQuery()",
        "  const [save] = useSavePartyMutation()",
        "  return <ul onClick={() => save(data)}>{data}</ul>",
        "}",
      ),
    }
    const view = viewOf(files, presentDiagramOf(files, addedOf(files)))

    expect(edgesFrom(view, "src/party.tsx#component@2:1").filter(([to]) => to.startsWith("src/api.ts"))).toStrictEqual(expect.arrayContaining([
      ["src/api.ts#property@4:5", "src/party.tsx#external-value@3:3@3:20"],
      ["src/api.ts#property@5:5", "src/party.tsx#external-value@4:3@4:18"],
    ]))
  })
})

describe("the rows that hold the lines of a component", () => {
  it("give a library hook handed a selector of the repository a call row in the card of that selector", () => {
    const files: FixtureFiles = {
      "src/selectors.ts": codeOf("export const selectMembers = (state) => state.party.members"),
      "src/party-page.tsx": codeOf(
        "import { useSelector } from \"react-redux\"",
        "import { selectMembers } from \"./selectors\"",
        "export const PartyPage = () => {",
        "  const members = useSelector(selectMembers)",
        "  return <p>{members}</p>",
        "}",
      ),
    }
    const view = viewOf(files, presentDiagramOf(files, addedOf(files)))

    expect(calleeCardsOf(nodeViewOf(view, "src/party-page.tsx#component@3:1"))).toStrictEqual([["selectMembers", "Function", ["useSelector()"]]])
    expect(edgesFrom(view, "src/party-page.tsx#component@3:1")).toStrictEqual([["src/selectors.ts#function@1:1", "src/party-page.tsx#component-effect@4:19@4:19"]])
  })

  it("give a tRPC query hook no call row beside its trigger row, and a mutation hook with its own card a call row whose line goes to that card", () => {
    const files: FixtureFiles = {
      ...TRPC_FILES,
      "src/client/add-todo.tsx": codeOf(
        "import { api } from \"./trpc\"",
        "export const AddTodo = () => {",
        "  const todos = api.todo.list.useQuery()",
        "  const createTodo = api.todo.create.useMutation({ onSuccess: () => { todos.refetch() } })",
        "  return <button onClick={() => createTodo.mutate(\"a\")}>{todos.data}</button>",
        "}",
      ),
    }
    const view = viewOf(files, presentDiagramOf(files, TRPC_CHANGE))
    const page = nodeViewOf(view, "src/client/add-todo.tsx#component@2:1")

    expect(calleeCardsOf(page)).toStrictEqual([["create", "Resolver", ["api.todo.create.useMutation()"]]])
    expect(edgesFrom(view, "src/client/add-todo.tsx#component@2:1")).toContainEqual(["src/client/add-todo.tsx#request@4:22", "src/client/add-todo.tsx#request@4:22@4:22"])
  })

  it("give a component a library wraps a component row", () => {
    const files: FixtureFiles = {
      "src/items.tsx": codeOf("import { observer } from \"mobx-react-lite\"", "const ItemsList = () => <ul />", "export const ItemsPage = observer(ItemsList)"),
      "src/App.tsx": codeOf("import { ItemsPage } from \"./items\"", "export const App = () => <main><ItemsPage /></main>"),
    }
    const app = nodeViewOf(viewOf(files, presentDiagramOf(files, addedOf(files))), "src/App.tsx#component@2:1")

    expect(app?.rowGroups.flatMap(({ renderGroups }) => renderGroups ?? []).flatMap(({ rows }) => rows.map(({ kind }) => kind))).toStrictEqual(["component"])
  })
})

describe("a selector folded into the call of a store hook", () => {
  it("gives no row to a call inside it, though that call is a method of a value of the store", () => {
    const files: FixtureFiles = {
      "src/team-store.ts": codeOf(
        "import { create } from \"zustand\"",
        "export const useTeamStore = create((set) => ({",
        "  memberIds: [],",
        "  addMember: (id) => set((state) => ({ memberIds: [...state.memberIds, id] })),",
        "}))",
      ),
      "src/trainer-row.tsx": codeOf(
        "import { useTeamStore } from \"./team-store\"",
        "export const TrainerRow = ({ id }) => {",
        "  const isMember = useTeamStore((state) => state.memberIds.includes(id))",
        "  return <li>{isMember}</li>",
        "}",
      ),
    }
    const view = viewOf(files, presentDiagramOf(files, addedOf(files)))

    expect(calleeCardsOf(nodeViewOf(view, "src/trainer-row.tsx#component@2:1"))).toStrictEqual([["useTeamStore", "State", ["useTeamStore()"]]])
  })
})
