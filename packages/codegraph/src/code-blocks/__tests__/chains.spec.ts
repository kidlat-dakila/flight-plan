import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { blockNamed, codeOf, groupOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "./group-fixture"

const ARROW = " → "

const labelOf = ({ type, name }: StoredCodeBlock): string => (name === undefined ? type : `${type} ${name}`)

const pathsFrom = (block: StoredCodeBlock, group: StoredCodeGroupGraph, walked: readonly string[]): string[] => {
  const next = group.codeBlocks.filter((candidate) => block.nextBlockIds.includes(candidate.id) && !walked.includes(candidate.id))
  if (next.length === 0) return [labelOf(block)]
  return next.flatMap((following) => pathsFrom(following, group, [...walked, block.id]).map((path) => `${labelOf(block)}${ARROW}${path}`))
}

const chainsOf = (group: StoredCodeGroupGraph): string[] =>
  group.codeBlocks.filter((block) => group.diffChainIds.includes(block.id)).flatMap((top) => pathsFrom(top, group, []))

const chainsIn = (files: FixtureFiles, diffs: FixtureDiffs): string[] => chainsOf(groupOf(files, diffs))

const USERS = codeOf("export const removeUser = (id) => {", "  return api.delete(id)", "}")
const USERS_CHANGE = { "src/users.ts": [rangeAt(2, 10, 2, 13)] }

describe("the chains of a group", () => {
  it("steps from a block into the condition nested in it, down to the block that has the change", () => {
    const group = groupOf({ "src/check.ts": codeOf("function check() {", "  if (b > 2) {", "    notify()", "  }", "}") }, { "src/check.ts": [rangeAt(2, 7, 2, 12)] })
    const check = blockNamed(group, "function", "check")
    const [condition] = group.codeBlocks.filter((block) => block.type === "condition")

    expect(chainsOf(group)).toStrictEqual(["function check → condition"])
    expect([check.lineOfCodeDiffs, check.diffSourceIds, check.nextBlockIds]).toStrictEqual([null, [condition.id], [condition.id]])
    expect([condition.diffSourceIds, condition.nextBlockIds]).toStrictEqual([[condition.id], []])
  })

  it("keeps a chain that splits as one entry, with both blocks after the split", () => {
    const group = groupOf(
      {
        "src/users.ts": USERS,
        "src/audit.ts": codeOf("export const logRemoval = (id) => {", "  audit.write(id)", "}"),
        "src/users-page.tsx": codeOf(
          "import { logRemoval } from \"./audit\"",
          "import { removeUser } from \"./users\"",
          "export const UsersPage = () => {",
          "  const handleDelete = (id) => {",
          "    removeUser(id)",
          "    logRemoval(id)",
          "  }",
          "  return <button onClick={() => handleDelete(1)}>Delete</button>",
          "}",
        ),
      },
      { ...USERS_CHANGE, "src/audit.ts": [rangeAt(2, 3, 2, 8)] },
    )

    expect(chainsOf(group)).toStrictEqual([
      "render-event onClick → function → function handleDelete → function removeUser",
      "render-event onClick → function → function handleDelete → function logRemoval",
    ])
    expect(group.diffChainIds).toStrictEqual(["src/users-page.tsx#render-event@8:18"])
    expect(blockNamed(group, "render-event", "onClick").diffSourceIds).toStrictEqual(["src/users.ts#function@1:1", "src/audit.ts#function@1:1"])
  })

  it("does not step where a value is only handed over, and carries on from the block it is handed to", () => {
    const chains = chainsIn(
      {
        "src/save.ts": codeOf("export const saveReview = () => {", "  return api.save()", "}"),
        "src/save-button.tsx": codeOf("export function SaveButton({ onSave }) {", "  return <button onClick={onSave}>Save</button>", "}"),
        "src/review-page.tsx": codeOf(
          "import { saveReview } from \"./save\"",
          "import { SaveButton } from \"./save-button\"",
          "export const ReviewPage = () => <SaveButton onSave={saveReview} />",
        ),
      },
      { "src/save.ts": [rangeAt(2, 10, 2, 13)] },
    )

    expect(chains).toStrictEqual(["render-event onClick → root-argument-value onSave → function saveReview"])
  })

  it("steps from a call of a member of an argument to the block of that member, and on to what was handed to it", () => {
    const chains = chainsIn(
      {
        "src/save.ts": codeOf("export const saveReview = () => {", "  return api.save()", "}"),
        "src/save-button.tsx": codeOf("export function SaveButton(props) {", "  return <button onClick={() => props.onSave()}>Save</button>", "}"),
        "src/toolbar.tsx": codeOf("import { SaveButton } from \"./save-button\"", "export const Toolbar = (props) => <SaveButton onSave={props.onSave} />"),
        "src/review-page.tsx": codeOf("import { saveReview } from \"./save\"", "import { Toolbar } from \"./toolbar\"", "export const ReviewPage = () => <Toolbar onSave={saveReview} />"),
      },
      { "src/save.ts": [rangeAt(2, 10, 2, 13)] },
    )

    expect(chains).toStrictEqual(["render-event onClick → function → root-argument-value onSave → root-argument-value onSave → function saveReview"])
  })

  it("steps from a render to the component, and from the component into its markup", () => {
    const chains = chainsIn(
      {
        "src/load-users.ts": codeOf("export const loadUsers = () => {", "  return []", "}"),
        "src/user-list.tsx": codeOf("import { loadUsers } from \"./load-users\"", "export const UserList = () => <ul>{loadUsers()}</ul>"),
        "src/users-page.tsx": codeOf("import { UserList } from \"./user-list\"", "export const UsersPage = () => <UserList />"),
      },
      { "src/load-users.ts": [rangeAt(2, 10, 2, 12)] },
    )

    expect(chains).toStrictEqual(["function UsersPage → render-root → render UserList → function UserList → render-root → render ul → function loadUsers"])
  })

  it("starts a chain of its own at an effect, and steps from the effect to its callbacks", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/page.tsx": codeOf("import { removeUser } from \"./users\"", "export const Page = () => {", "  useEffect(() => { removeUser(1) }, [])", "  watch(removeUser)", "  return <b />", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual([
      "component-effect → effect-callback 0 → function → function removeUser",
      "component-effect → effect-callback 0 → function removeUser",
    ])
  })

  it("reaches the callbacks of a kept result from where the result is used, and starts a chain at a code-event", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/page.tsx": codeOf(
          "import { removeUser } from \"./users\"",
          "export const Page = () => {",
          "  const { mutate } = useMutation({ mutationFn: removeUser, onSuccess: () => removeUser(0) })",
          "  return <button onClick={() => mutate(1)}>Delete</button>",
          "}",
        ),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual([
      "code-event onSuccess → function → function removeUser",
      "render-event onClick → function → external-value mutate → effect-callback mutationFn → function removeUser",
    ])
  })

  it("reaches the callbacks of a result that is read in the body or the markup from the component", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/page.tsx": codeOf("import { removeUser } from \"./users\"", "export const Page = () => {", "  const query = useQuery({ queryFn: removeUser })", "  return <b>{query.data}</b>", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual(["function Page → render-root → render b → external-value query → effect-callback queryFn → function removeUser"])
  })

  it("steps from a render of a component wrapped in a call to the function inside the wrapper", () => {
    const chains = chainsIn(
      {
        "src/button.tsx": codeOf("export const Button = forwardRef((props, ref) => <button ref={ref} />)"),
        "src/page.tsx": codeOf("import { Button } from \"./button\"", "export const Page = () => <Button />"),
      },
      { "src/button.tsx": [rangeAt(1, 58, 1, 61)] },
    )

    expect(chains).toStrictEqual(["function Page → render-root → render Button → root-variable Button → effect-callback 0 → function → render-root → render button"])
  })

  it("starts a chain at a statement at the root of a file", () => {
    const chains = chainsIn(
      {
        "src/rate-limit.ts": codeOf("export const rateLimit = (options) => {", "  return options", "}"),
        "src/server.ts": codeOf("import { rateLimit } from \"./rate-limit\"", "app.use(rateLimit({ perMinute: 60 }))"),
      },
      { "src/rate-limit.ts": [rangeAt(2, 10, 2, 17)] },
    )

    expect(chains).toStrictEqual(["root-statement → function rateLimit"])
  })

  it("ends a chain, going up, at a function that is declared and never called", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/page.tsx": codeOf("import { removeUser } from \"./users\"", "export const Page = () => {", "  const exportAll = () => {", "    removeUser(0)", "  }", "  return <b />", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual(["function exportAll → function removeUser"])
  })

  it("does not pass through state: a write of state is not a step to what reads it", () => {
    const chains = chainsIn(
      {
        "src/page.tsx": codeOf(
          "const OrderList = ({ status }) => <ul>{status}</ul>",
          "export const Page = () => {",
          "  const [status, setStatus] = useState(\"open\")",
          "  return <><button onClick={() => setStatus(\"paid\")} /><OrderList status={status} /></>",
          "}",
        ),
      },
      { "src/page.tsx": [rangeAt(1, 40, 1, 46)] },
    )

    expect(chains).toStrictEqual(["function Page → render-root → render → render OrderList → function OrderList → render-root → render ul"])
  })

  it("steps from a read of a value to the value, also where the value is only handed over", () => {
    const chains = chainsIn(
      {
        "src/config.ts": codeOf("export const MAX_RETRIES = 5", "export const STATUSES = [1]", "export const UNUSED = 2"),
        "src/orders.tsx": codeOf(
          "import { MAX_RETRIES, STATUSES } from \"./config\"",
          "export const fetchOrders = () => retry(loadOrders, MAX_RETRIES)",
          "export const Filter = () => <Select options={STATUSES} />",
        ),
      },
      { "src/config.ts": [rangeAt(1, 28, 1, 29), rangeAt(2, 26, 2, 27), rangeAt(3, 23, 3, 24)] },
    )

    expect(chains).toStrictEqual([
      "root-variable UNUSED",
      "function fetchOrders → root-variable MAX_RETRIES",
      "function Filter → render-root → render Select → root-variable STATUSES",
    ])
  })

  it("steps from a function into an effect it returns, and from there to the callbacks", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/use-users.ts": codeOf("import { removeUser } from \"./users\"", "export const useUsers = () => {", "  return useQuery({ queryFn: removeUser })", "}"),
        "src/page.tsx": codeOf("import { useUsers } from \"./use-users\"", "export const Page = () => {", "  const users = useUsers()", "  return <b>{users.data}</b>", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual([
      "function Page → external-value users → hook useUsers → component-effect → effect-callback queryFn → function removeUser",
      "function Page → render-root → render b → external-value users → hook useUsers → component-effect → effect-callback queryFn → function removeUser",
    ])
  })

  it("does not count an element outside the markup a function returns as a render, so a page of a route table is a top", () => {
    const group = groupOf(
      {
        "src/orders-page.tsx": codeOf("export const OrdersPage = () => <b>orders</b>"),
        "src/routes.tsx": codeOf("import { OrdersPage } from \"./orders-page\"", "export const routes = [{ path: \"/orders\", element: <OrdersPage /> }]"),
      },
      { "src/orders-page.tsx": [rangeAt(1, 35, 1, 41)] },
    )
    const [element] = group.codeBlocks.filter((block) => block.type === "render" && block.name === "OrdersPage")

    expect(element.outerSymbols.map((symbol) => [symbol.use, symbol.handedToId])).toStrictEqual([["value", null]])
    expect(chainsOf(group)).toStrictEqual(["function OrdersPage → render-root → render b"])
  })

  it("carries a chain on from a changed block to a changed block it runs", () => {
    const group = groupOf(
      { "src/users.ts": codeOf("const audit = () => {", "  return 1", "}", "export const removeUser = () => {", "  return audit()", "}") },
      { "src/users.ts": [rangeAt(2, 10, 2, 11), rangeAt(5, 10, 5, 15)] },
    )

    expect(chainsOf(group)).toStrictEqual(["function removeUser → function audit"])
    expect(blockNamed(group, "function", "removeUser").diffSourceIds).toStrictEqual(["src/users.ts#function@1:1", "src/users.ts#function@4:1"])
  })

  it("runs a chain to the last changed block of a path, through a changed block in the middle", () => {
    const group = groupOf(
      {
        "src/orders.ts": codeOf(
          "export const postOrder = async (request) => {",
          "  const order = parseOrder(request.body)",
          "  return placeOrder(order)",
          "}",
          "const placeOrder = async (order) => save({ ...order, total: totalOf(order) })",
          "const totalOf = (order) => roundOnce(sum(order.lines))",
        ),
      },
      { "src/orders.ts": [rangeAt(2, 17, 2, 27), rangeAt(6, 28, 6, 37)] },
    )
    const [postOrder, totalOf] = [blockNamed(group, "function", "postOrder"), blockNamed(group, "function", "totalOf")]

    expect(chainsOf(group)).toStrictEqual(["function postOrder → function placeOrder → function totalOf"])
    expect(postOrder.diffSourceIds).toStrictEqual([postOrder.id, totalOf.id])
    expect(totalOf.nextBlockIds).toStrictEqual([])
  })

  it("steps into a function with no name that is written in place, such as the callback of a collection method", () => {
    const chains = chainsIn(
      { "src/total.ts": codeOf("export const totalOf = (lines) => lines.map((line) => {", "  return line.price", "})") },
      { "src/total.ts": [rangeAt(2, 10, 2, 20)] },
    )

    expect(chains).toStrictEqual(["function totalOf → function"])
  })

  it("has one top for blocks that only run each other", () => {
    const chains = chainsIn(
      { "src/walk.ts": codeOf("const down = (node) => {", "  return up(node)", "}", "const up = (node) => {", "  return down(node)", "}") },
      { "src/walk.ts": [rangeAt(2, 10, 2, 12)] },
    )

    expect(chains).toStrictEqual(["function down → function up"])
  })

  it("starts a chain at a route the catalogue names, and steps from the route to its handler", () => {
    const files = {
      "src/users.ts": USERS,
      "src/server.ts": codeOf("import express from \"express\"", "import { removeUser } from \"./users\"", "const app = express()", "app.delete(\"/users/:id\", (request) => removeUser(request.params.id))"),
    }

    expect(chainsIn(files, USERS_CHANGE)).toStrictEqual(["route → effect-callback 1 → function → function removeUser"])
  })

  it("steps from a class to its methods", () => {
    const chains = chainsIn(
      {
        "src/cart.ts": codeOf("export class Cart {", "  subtotal() {", "    return 1", "  }", "}"),
        "src/checkout.ts": codeOf("import { Cart } from \"./cart\"", "export const checkout = () => new Cart().subtotal()"),
      },
      { "src/cart.ts": [rangeAt(3, 12, 3, 13)] },
    )

    expect(chains).toStrictEqual(["function checkout → class Cart → method Cart.subtotal"])
  })

  it("reaches the callbacks of a kept result from a block that hands the result on", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/use-users.ts": codeOf("import { removeUser } from \"./users\"", "export const useUsers = () => {", "  const users = useStore(removeUser)", "  return { users }", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual(["hook useUsers → external-value users → effect-callback 0 → function removeUser"])
  })

  it("starts no chain at an argument that nothing calls", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/format.ts": codeOf("export const format = (count) => String(count)"),
        "src/page.ts": codeOf("import { format } from \"./format\"", "import { removeUser } from \"./users\"", "export const page = () => format(removeUser)"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual(["function removeUser"])
  })

  it("steps from a block to a function declared inside it, from the place that calls it", () => {
    const chains = chainsIn({ "src/page.ts": codeOf("export const load = () => {", "  const read = () => {", "    return 1", "  }", "  return read()", "}") }, { "src/page.ts": [rangeAt(3, 12, 3, 13)] })

    expect(chains).toStrictEqual(["function load → function read"])
  })

  it("traces a change in an argument of a function as a change of the function", () => {
    const group = groupOf({ "src/price.ts": codeOf("export const priceOf = (item, rate) => item") }, { "src/price.ts": [rangeAt(1, 31, 1, 35)] })

    expect([group.diffBlockIds, chainsOf(group)]).toStrictEqual([["src/price.ts#root-argument-value@1:31"], ["function priceOf"]])
  })

  it("takes no step from a type that names a changed value", () => {
    const chains = chainsIn(
      { "src/schema.ts": codeOf("export const schema = { name: 1 }", "export type Profile = typeof schema") },
      { "src/schema.ts": [rangeAt(1, 31, 1, 32)] },
    )

    expect(chains).toStrictEqual(["root-variable schema"])
  })

  it("traces no chain from a type, an import or a file no language reads", () => {
    const group = groupOf(
      { "src/types.ts": codeOf("import { a } from \"lib\"", "export type Id = string"), "schema.sql": "create table a;" },
      { "src/types.ts": [rangeAt(1, 10, 1, 11), rangeAt(2, 18, 2, 24)], "schema.sql": [rangeAt(1, 1, 1, 7)] },
    )

    expect([group.diffContains, group.chainContains, group.diffChainIds, group.codeBlocks.flatMap((block) => block.diffSourceIds)]).toStrictEqual([["type", "file", "logic"], [], [], []])
  })
})

describe("what the chains of a group contain", () => {
  it("says ui when a chain passes through a component the diff did not change", () => {
    const group = groupOf(
      {
        "src/load-users.ts": codeOf("export const loadUsers = () => {", "  return []", "}"),
        "src/users-page.tsx": codeOf("import { loadUsers } from \"./load-users\"", "export const UsersPage = () => <ul>{loadUsers()}</ul>"),
      },
      { "src/load-users.ts": [rangeAt(2, 10, 2, 12)] },
    )

    expect([group.diffContains, group.chainContains]).toStrictEqual([["logic"], ["ui", "logic"]])
  })

  it("is empty, and no chain is traced, when the diff holds only types and files no language reads", () => {
    const group = groupOf({ "src/types.ts": "export type Id = string" }, { "src/types.ts": [rangeAt(1, 18, 1, 24)] })

    expect([group.diffContains, group.chainContains, group.diffChainIds]).toStrictEqual([["type"], [], []])
  })
})

const STORE = codeOf(
  "export const useCartStore = create((set) => ({",
  "  items: [],",
  "  addItem: (product) => {",
  "    const added = [product]",
  "    set({ items: added })",
  "  },",
  "  clear: () => {",
  "    const none = []",
  "    set({ items: none })",
  "  },",
  "}))",
)
const BUTTON = codeOf(
  "import { useCartStore } from \"./cart-store\"",
  "export const AddToCartButton = ({ product }) => {",
  "  const addItem = useCartStore((state) => state.addItem)",
  "  return <button onClick={() => addItem(product)}>Add</button>",
  "}",
)

describe("a chain through a member of a value", () => {
  it("reaches a changed action of a store from the call of the result that took it", () => {
    const group = groupOf({ "src/cart-store.ts": STORE, "src/button.tsx": BUTTON }, { "src/cart-store.ts": [rangeAt(4, 19, 4, 28)] })
    const [taken] = blockNamed(group, "external-value", "addItem").childrenBlockIds
      .flatMap((effectId) => group.codeBlocks.filter((block) => block.parentBlockId === effectId))
      .flatMap((callback) => group.codeBlocks.filter((block) => block.parentBlockId === callback.id))
      .flatMap((selector) => selector.outerSymbols)

    expect([taken.use, taken.member]).toStrictEqual(["read", { path: ["addItem"], blockId: "src/cart-store.ts#function@3:3" }])
    expect(chainsOf(group)).toStrictEqual(["render-event onClick → function → external-value addItem → effect-callback 0 → function → function addItem"])
  })

  it("does not reach an action the result did not take", () => {
    const chains = chainsIn({ "src/cart-store.ts": STORE, "src/button.tsx": BUTTON }, { "src/cart-store.ts": [rangeAt(8, 18, 8, 20)] })

    expect(chains).toStrictEqual(["function clear"])
  })

  it("steps from a call of a member of an object of the repository to the function of that member", () => {
    const chains = chainsIn(
      { "src/api.ts": codeOf("const api = {", "  remove(id) {", "    return id", "  },", "}", "export const removeUser = (id) => api.remove(id)") },
      { "src/api.ts": [rangeAt(3, 12, 3, 14)] },
    )

    expect(chains).toStrictEqual(["function removeUser → function remove"])
  })
})

const THEME = codeOf(
  "import { createContext, useContext, useMemo } from \"react\"",
  "const ThemeContext = createContext(null)",
  "export function ThemeProvider({ children }) {",
  "  const value = useMemo(() => ({ theme: 1, toggleTheme: () => flip() }), [])",
  "  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>",
  "}",
  "export function useTheme() {",
  "  const value = useContext(ThemeContext)",
  "  return value",
  "}",
)
const THEME_CHANGE = { "src/theme.tsx": [rangeAt(4, 62, 4, 66)] }

describe("a chain through the origin of a value", () => {
  it("reaches a function a context provides from a name taken apart from the hook that reads the context", () => {
    const chains = chainsIn(
      {
        "src/theme.tsx": THEME,
        "src/toggle.tsx": codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const { toggleTheme } = useTheme()", "  return <button onClick={toggleTheme} />", "}"),
      },
      THEME_CHANGE,
    )

    expect(chains).toStrictEqual(["render-event onClick → function toggleTheme"])
  })

  it("reads what a context provides from the catalogue: the element of the context itself provides, and a context no pattern names does not", () => {
    const toggle = codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const { toggleTheme } = useTheme()", "  return <button onClick={toggleTheme} />", "}")
    const itself = THEME.replace("<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>", "<ThemeContext value={value}>{children}</ThemeContext>")
    const unknown = THEME.replace("from \"react\"", "from \"other\"")

    expect(chainsIn({ "src/theme.tsx": itself, "src/toggle.tsx": toggle }, THEME_CHANGE)).toStrictEqual(["render-event onClick → function toggleTheme"])
    expect(chainsIn({ "src/theme.tsx": unknown, "src/toggle.tsx": toggle }, THEME_CHANGE)).toStrictEqual(["function toggleTheme"])
  })

  it("reaches it from a member of the whole value too", () => {
    const chains = chainsIn(
      {
        "src/theme.tsx": THEME,
        "src/toggle.tsx": codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const theme = useTheme()", "  return <button onClick={() => theme.toggleTheme()} />", "}"),
      },
      THEME_CHANGE,
    )

    expect(chains).toStrictEqual(["render-event onClick → function → function toggleTheme"])
  })

  it("takes what a context provides from the attribute its pattern names, and from no other", () => {
    const provider = codeOf(
      "import { createContext, useContext } from \"react\"",
      "const ThemeContext = createContext(null)",
      "const fallback = { toggleTheme: () => flip() }",
      "const value = { toggleTheme: () => keep() }",
      "export const ThemeProvider = ({ children }) => <ThemeContext.Provider value={value} fallback={fallback}>{children}</ThemeContext.Provider>",
      "export const useTheme = () => useContext(ThemeContext)",
    )
    const toggle = codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const { toggleTheme } = useTheme()", "  return <button onClick={toggleTheme} />", "}")

    expect(chainsIn({ "src/theme.tsx": provider, "src/toggle.tsx": toggle }, { "src/theme.tsx": [rangeAt(3, 39, 3, 43)] })).toStrictEqual(["function toggleTheme"])
    expect(chainsIn({ "src/theme.tsx": provider, "src/toggle.tsx": toggle }, { "src/theme.tsx": [rangeAt(4, 36, 4, 40)] })).toStrictEqual(["render-event onClick → function toggleTheme"])
  })

  it("reaches a function a context provides from the function written inside the element that reads the context", () => {
    const consumer = codeOf(
      "import { ThemeContext } from \"./theme\"",
      "export const Toggle = () => <ThemeContext.Consumer>{(theme) => <button onClick={theme.toggleTheme} />}</ThemeContext.Consumer>",
    )
    const exported = THEME.replace("const ThemeContext", "export const ThemeContext")
    const unread = consumer.replaceAll("ThemeContext.Consumer", "ThemeContext.Watcher")

    expect(chainsIn({ "src/theme.tsx": exported, "src/toggle.tsx": consumer }, THEME_CHANGE)).toStrictEqual(["render-event onClick → function toggleTheme"])
    expect(chainsIn({ "src/theme.tsx": exported, "src/toggle.tsx": unread }, THEME_CHANGE)).toStrictEqual(["function toggleTheme"])
  })

  it("leads to what a context provides only where a call its pattern names reads the context", () => {
    const named = THEME.replace("const value = useContext(ThemeContext)", "const value = describe(ThemeContext)")
    const toggle = codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const { toggleTheme } = useTheme()", "  return <button onClick={toggleTheme} />", "}")

    expect(chainsIn({ "src/theme.tsx": named, "src/toggle.tsx": toggle }, THEME_CHANGE)).toStrictEqual(["function toggleTheme"])
  })

  it("takes a function handed to a call that provides a value as a value, so the call is no effect and the function is reached from where the value is read", () => {
    const files = {
      "src/theme.ts": codeOf("export const themeKey = Symbol(\"theme\")"),
      "src/App.vue": codeOf(
        "<script setup>",
        "import { provide } from \"vue\"",
        "import { themeKey } from \"./theme\"",
        "const toggleTheme = () => flip()",
        "provide(themeKey, { toggleTheme })",
        "</script>",
        "<template><p /></template>",
      ),
      "src/Toggle.vue": codeOf(
        "<script setup>",
        "import { inject } from \"vue\"",
        "import { themeKey } from \"./theme\"",
        "const context = inject(themeKey)",
        "</script>",
        "<template><button @click=\"context.toggleTheme()\">Switch</button></template>",
      ),
    }
    const group = groupOf(files, { "src/App.vue": [rangeAt(4, 27, 4, 31)] })

    expect(group.codeBlocks.filter((block) => block.filePath === "src/App.vue" && block.type === "component-effect")).toStrictEqual([])
    expect(chainsOf(group)).toStrictEqual(["render-event onClick → function toggleTheme"])
  })

  it("reaches a function a value names under a key, written out or in short", () => {
    const provider = codeOf(
      "import { createContext, useContext } from \"react\"",
      "const ThemeContext = createContext(null)",
      "export function ThemeProvider({ children }) {",
      "  const toggleTheme = () => flip()",
      "  const reset = () => flip()",
      "  return <ThemeContext.Provider value={{ toggleTheme, clear: reset }}>{children}</ThemeContext.Provider>",
      "}",
      "export const useTheme = () => useContext(ThemeContext)",
    )
    const toggle = codeOf("import { useTheme } from \"./theme\"", "export const Toggle = () => {", "  const { toggleTheme, clear } = useTheme()", "  return <button onClick={toggleTheme} onBlur={clear} />", "}")

    expect(chainsIn({ "src/theme.tsx": provider, "src/toggle.tsx": toggle }, { "src/theme.tsx": [rangeAt(4, 29, 4, 33), rangeAt(5, 23, 5, 27)] })).toStrictEqual([
      "render-event onClick → function toggleTheme",
      "render-event onBlur → function reset",
    ])
  })

  it("looks a member up by its whole path, also through a name taken apart more than one level deep", () => {
    const api = codeOf(
      "const api = {",
      "  users: { remove(id) { return drop(id) } },",
      "  orders: { remove(id) { return id } },",
      "}",
      "export const removeUser = (id) => api.users.remove(id)",
      "export const removeOrder = (id) => {",
      "  const { orders: { remove } } = api",
      "  return remove(id)",
      "}",
    )

    expect(chainsIn({ "src/api.ts": api }, { "src/api.ts": [rangeAt(2, 32, 2, 36)] })).toStrictEqual(["function removeUser → function remove"])
    expect(chainsIn({ "src/api.ts": api }, { "src/api.ts": [rangeAt(3, 33, 3, 35)] })).toStrictEqual(["function removeOrder → function remove"])
  })

  it("reaches a method of a class from a member of what the class made", () => {
    const service = codeOf("class Mailer {", "  send(mail) {", "    return mail", "  }", "}", "const mailer = new Mailer()", "export const notify = (mail) => mailer.send(mail)")

    expect(chainsIn({ "src/mailer.ts": service }, { "src/mailer.ts": [rangeAt(3, 12, 3, 16)] })).toContain("function notify → method Mailer.send")
  })

  it("runs a call whose result is kept with the body that holds the declaration, and a call kept at the root of a file with a use of the result", () => {
    const page = codeOf("export const Page = () => {", "  const { mutate } = useMutation({ mutationFn: () => 1, retry: 2 })", "  return <button onClick={mutate} />", "}")

    expect(chainsIn({ "src/page.tsx": page }, { "src/page.tsx": [rangeAt(2, 64, 2, 65)] })).toStrictEqual(["function Page → component-effect"])
    expect(chainsIn({ "src/cart-store.ts": STORE, "src/button.tsx": BUTTON }, { "src/cart-store.ts": [rangeAt(1, 29, 1, 35)] })).toStrictEqual([
      "function AddToCartButton → component-effect → root-variable useCartStore → effect",
    ])
  })

  it("starts the chain of a page at the slot of the route table that names it, whether it names an element, a component or a function that loads one", () => {
    const router = codeOf(
      "import { createBrowserRouter } from \"react-router\"",
      "import { CartPage } from \"./cart\"",
      "export const router = createBrowserRouter([",
      "  { path: \"/cart\", element: <CartPage /> },",
      "  { path: \"/basket\", Component: CartPage },",
      "  { path: \"/account\", lazy: async () => load() },",
      "])",
    )
    const files = { "src/cart.tsx": codeOf("export const CartPage = () => <b>{1}</b>"), "src/router.tsx": router }

    expect(chainsIn(files, { "src/cart.tsx": [rangeAt(1, 36, 1, 37)] })).toStrictEqual([
      "effect-callback element → render CartPage → function CartPage → render-root → render b",
      "effect-callback Component → function CartPage → render-root → render b",
    ])
    expect(chainsIn(files, { "src/router.tsx": [rangeAt(6, 40, 6, 44)] })).toStrictEqual(["effect-callback lazy → function"])
  })

  it("runs a function passed by name to a method of a list or of a promise where it is passed", () => {
    const cart = codeOf("const priceOf = (item) => item.price", "export const subtotal = (items) => items.map(priceOf)", "export const load = () => fetchItems().then(priceOf)")

    expect(chainsIn({ "src/cart.ts": cart }, { "src/cart.ts": [rangeAt(1, 27, 1, 37)] })).toStrictEqual(["function subtotal → function priceOf", "function load → function priceOf"])
  })

  it("runs a call written in the handler of an event with the event, and its callback after it", () => {
    const form = codeOf(
      "import { useForm } from \"lib\"",
      "export const Form = () => {",
      "  const { handleSubmit } = useForm()",
      "  const onSubmit = (values) => save(values)",
      "  return <form onSubmit={handleSubmit(onSubmit)} />",
      "}",
    )

    expect(chainsIn({ "src/form.tsx": form }, { "src/form.tsx": [rangeAt(4, 32, 4, 36)] })).toStrictEqual(["render-event onSubmit → effect → effect-callback 0 → function onSubmit"])
  })

  it("leads a name taken apart from a result that holds no such function to the declaration", () => {
    const chains = chainsIn(
      {
        "src/users.ts": USERS,
        "src/page.tsx": codeOf("import { removeUser } from \"./users\"", "export const Page = () => {", "  const { mutate } = useMutation({ mutationFn: removeUser })", "  return <button onClick={mutate} />", "}"),
      },
      USERS_CHANGE,
    )

    expect(chains).toStrictEqual(["render-event onClick → external-value mutate → effect-callback mutationFn → function removeUser"])
  })

  it("steps from a function into an effect it holds that is not directly in a component or a hook", () => {
    const store = codeOf("export const useCartStore = create((set) => ({", "  addItem: (product) => {", "    set((state) => ({ items: [...state.items, product] }))", "  },", "}))")
    const chains = chainsIn({ "src/cart-store.ts": store, "src/button.tsx": BUTTON }, { "src/cart-store.ts": [rangeAt(3, 5, 3, 8)] })

    expect(chains).toStrictEqual(["render-event onClick → function → external-value addItem → effect-callback 0 → function → function addItem → effect"])
  })
})
