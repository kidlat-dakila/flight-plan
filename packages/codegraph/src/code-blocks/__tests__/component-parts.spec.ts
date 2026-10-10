import { createComponentPartsFinder } from "@/code-blocks/component-parts"
import { codeOf, groupOf, rangeAt } from "./group-fixture"

const ORDERS = codeOf("export const fetchOrders = () => {", "  return []", "}")
const PAGE = codeOf(
  "import { useEffect, useMemo, useState } from \"react\"",
  "import { useQuery } from \"lib\"",
  "import { fetchOrders } from \"./orders\"",
  "const useOrders = () => useQuery({ queryFn: fetchOrders })",
  "export const OrdersPage = () => {",
  "  const [status, setStatus] = useState(\"open\")",
  "  const [page] = useState(fetchOrders)",
  "  const total = useMemo(() => fetchOrders().length, [])",
  "  const orders = useOrders()",
  "  const theme = useTheme()",
  "  useEffect(() => { fetchOrders() }, [])",
  "  useEffect(() => { document.title = status }, [status])",
  "  const handleSave = () => {",
  "    const saved = useOrders()",
  "  }",
  "  return <b>{orders.data}</b>",
  "}",
)

const partsOfPage = (pageRanges: Parameters<typeof rangeAt>[] = []): ReturnType<ReturnType<typeof createComponentPartsFinder>> =>
  createComponentPartsFinder([
    groupOf({ "src/orders.ts": ORDERS, "src/page.tsx": PAGE }, { "src/orders.ts": [rangeAt(2, 10, 2, 12)], "src/page.tsx": pageRanges.map((range) => rangeAt(...range)) }),
  ])("src/page.tsx", "OrdersPage")

describe("the parts of a component", () => {
  it("lists the state of the component that leads to a change, as related, and leaves out the state that does not", () => {
    expect(partsOfPage().states).toStrictEqual([
      { name: "page", changeType: "related", reference: [7, 7] },
      { name: "total", changeType: "related", reference: [8, 8] },
    ])
  })

  it("lists a hook whose result the component keeps under the name of the hook, when it leads to a change", () => {
    expect(partsOfPage().hooks).toStrictEqual([{ name: "useOrders", changeType: "related", reference: [9, 9] }])
  })

  it("lists an effect that keeps no result under the name of what it calls, when it leads to a change", () => {
    expect(partsOfPage().effects).toStrictEqual([{ name: "useEffect (1)", changeType: "related", reference: [11, 11], nodeId: null }])
  })

  it("numbers the calls of one name in the order they are written, also when only a later one leads to a change", () => {
    const parts = partsOfPage([[12, 21, 12, 29]])
    const twice = createComponentPartsFinder([
      groupOf(
        { "src/orders.ts": ORDERS, "src/filter.tsx": codeOf("import { fetchOrders } from \"./orders\"", "import { useStore } from \"lib\"", "export const Filter = () => {", "  const status = useStore(fetchOrders)", "  const other = useStore((state) => state.other)", "  const set = useStore(fetchOrders)", "  return <b>{status}{set}</b>", "}") },
        { "src/orders.ts": [rangeAt(2, 10, 2, 12)] },
      ),
    ])("src/filter.tsx", "Filter")

    expect(parts.effects.map((effect) => effect.name)).toStrictEqual(["useEffect (1)", "useEffect (2)"])
    expect(parts.hooks.map((hook) => hook.name)).toStrictEqual(["useOrders"])
    expect(twice.hooks.map((hook) => hook.name)).toStrictEqual(["useStore (1)", "useStore (3)"])
  })

  it("marks a part the diff changed itself as diff", () => {
    const parts = partsOfPage([[6, 40, 6, 46], [12, 21, 12, 29]])

    expect(parts.states[0]).toStrictEqual({ name: "status", changeType: "diff", reference: [6, 6] })
    expect(parts.effects[1]).toStrictEqual({ name: "useEffect (2)", changeType: "diff", reference: [12, 12], nodeId: null })
  })

  it("leaves out what a function declared in the component holds", () => {
    expect(partsOfPage().hooks.map((hook) => hook.reference)).toStrictEqual([[9, 9]])
  })

  it("lists the parts of the function inside a component wrapped in a call", () => {
    const find = createComponentPartsFinder([
      groupOf(
        { "src/button.tsx": codeOf("import { useState } from \"react\"", "export const Button = memo(() => {", "  const [isBusy] = useState(false)", "  return <button />", "})") },
        { "src/button.tsx": [rangeAt(3, 31, 3, 36)] },
      ),
    ])

    expect(find("src/button.tsx", "Button").states).toStrictEqual([{ name: "isBusy", changeType: "diff", reference: [3, 3] }])
  })

  it("lists nothing for a name that is no component of the group", () => {
    const find = createComponentPartsFinder([groupOf({ "src/orders.ts": ORDERS })])

    expect([find("src/orders.ts", "fetchOrders"), find("src/missing.ts", "Missing")]).toStrictEqual([
      { states: [], dataFetches: [], hooks: [], effects: [] },
      { states: [], dataFetches: [], hooks: [], effects: [] },
    ])
  })

  it("lists a hook, an effect or a kept call as a data fetch when its chain holds a data-fetch block", () => {
    const find = createComponentPartsFinder([
      groupOf(
        {
          "src/api.ts": codeOf("export const loadUsers = () => fetch(\"/api/users\")", "export const countUsers = () => 2"),
          "src/users.tsx": codeOf(
            "import { useEffect } from \"react\"",
            "import { useCount, useQuery } from \"lib\"",
            "import { countUsers, loadUsers } from \"./api\"",
            "const useUsers = () => useQuery({ queryFn: loadUsers })",
            "export const UsersPage = () => {",
            "  const users = useUsers()",
            "  const first = loadUsers()",
            "  const count = useCount(countUsers)",
            "  useEffect(() => { loadUsers() }, [])",
            "  useEffect(() => { countUsers() }, [])",
            "  return <b>{users.data}</b>",
            "}",
          ),
        },
        { "src/api.ts": [rangeAt(1, 33, 1, 49), rangeAt(2, 34, 2, 35)] },
      ),
    ])

    expect(find("src/users.tsx", "UsersPage")).toStrictEqual({
      states: [],
      dataFetches: [
        { name: "useUsers", changeType: "related", reference: [6, 6], nodeId: null },
        { name: "loadUsers", changeType: "related", reference: [7, 7], nodeId: null },
        { name: "useEffect (1)", changeType: "related", reference: [9, 9], nodeId: null },
      ],
      hooks: [{ name: "useCount", changeType: "related", reference: [8, 8] }],
      effects: [{ name: "useEffect (2)", changeType: "related", reference: [10, 10], nodeId: null }],
    })
  })
})
