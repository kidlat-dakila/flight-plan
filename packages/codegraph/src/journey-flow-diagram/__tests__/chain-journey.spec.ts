import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT } from "@/import-graph/__tests__/fake-git-adapter"
import { buildCodegraph } from "@/index"
import { listJourneyPaths } from "@/journey-flow-diagram/paths"
import type { JourneyFlow } from "@flightplan/configurations"

type Files = Readonly<Record<string, string>>

const codeOf = (...lines: readonly string[]): string => lines.join("\n")

const journeysOf = async (base: Files, head: Files): Promise<JourneyFlow[]> => {
  const { segments } = await buildCodegraph({ gitAdapter: createFakeGitAdapter({ base, head }), baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return segments.flatMap((segment) => (segment.journeyFlowDiagram === null ? [] : [segment.journeyFlowDiagram]))
}

const journeyOf = async (unchanged: Files, changedPath: string, before: string, after: string): Promise<JourneyFlow> => {
  const [journey] = await journeysOf({ ...unchanged, [changedPath]: before }, { ...unchanged, [changedPath]: after })
  return journey
}

const entryLabelsOf = (journey: JourneyFlow): string[] => journey.nodes.flatMap((node) => (node.kind === "entry-point" ? [`${node.trigger}: ${node.label}`] : []))

const USERS_BEFORE = codeOf("export const removeUser = (id) => {", "  return drop(id)", "}")
const USERS_AFTER = codeOf("export const removeUser = (id) => {", "  return dropNow(id)", "}")

describe("a journey drawn from chains", () => {
  it("starts at the user action of the event whose handler runs the change, on a node named after the handler", async () => {
    const page = codeOf(
      "import { removeUser } from \"./users\"",
      "export const UsersPage = () => {",
      "  const handleDelete = (id) => {",
      "    removeUser(id)",
      "  }",
      "  return <button onClick={() => handleDelete(1)}>Delete</button>",
      "}",
    )
    const journey = await journeyOf({ "src/users-page.tsx": page }, "src/users.ts", USERS_BEFORE, USERS_AFTER)

    expect(entryLabelsOf(journey)).toStrictEqual(["user-action: A user clicks Delete"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → UsersPage.handleDelete → removeUser (changed)"])
  })

  it("moves the handler node to the component that hands the handler over, and lists the props between on the trigger", async () => {
    const files = {
      "src/button.tsx": codeOf("export const Button = ({ onClick }) => <button onClick={onClick}>Pay</button>"),
      "src/checkout-button.tsx": codeOf("import { Button } from \"./button\"", "export const CheckoutButton = ({ onCheckout }) => <Button onClick={onCheckout} />"),
    }
    const pageOf = (paid: string): string =>
      codeOf(
        "import { CheckoutButton } from \"./checkout-button\"",
        "export const CartPage = () => {",
        "  const handleCheckout = () => {",
        `    pay(${paid})`,
        "  }",
        "  return <CheckoutButton onCheckout={handleCheckout} />",
        "}",
      )
    const journey = await journeyOf(files, "src/cart-page.tsx", pageOf("1"), pageOf("2"))
    const trigger = journey.edges.find((edge) => edge.kind === "trigger")

    expect(entryLabelsOf(journey)).toStrictEqual(["user-action: A user clicks Pay"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → CartPage.handleCheckout (changed)"])
    expect(trigger?.through).toStrictEqual(["Button.onClick", "CheckoutButton.onCheckout"])
  })

  it("ends the trace on the prop of a component it cannot open", async () => {
    const page = codeOf(
      "import { CheckoutButton } from \"design-system\"",
      "import { removeUser } from \"./users\"",
      "export const CartPage = () => <CheckoutButton onCheckout={() => removeUser(1)} />",
    )
    const journey = await journeyOf({ "src/cart-page.tsx": page }, "src/users.ts", USERS_BEFORE, USERS_AFTER)

    expect(entryLabelsOf(journey)).toStrictEqual(["user-action: A user triggers checkout on the CheckoutButton"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → CartPage.onCheckout → removeUser (changed)"])
  })

  it("gives an effect of a component an entry point and a node of its own, and the effect of the component the id of that node", async () => {
    const page = codeOf(
      "import { useEffect } from \"react\"",
      "import { removeUser } from \"./users\"",
      "export const UsersPage = () => {",
      "  useEffect(() => {",
      "    removeUser(1)",
      "  }, [])",
      "  return <b>Users</b>",
      "}",
    )
    const journey = await journeyOf({ "src/users-page.tsx": page }, "src/users.ts", USERS_BEFORE, USERS_AFTER)
    const effect = journey.nodes.find((node) => node.kind === "declaration" && node.category === "effect")

    expect(entryLabelsOf(journey)).toStrictEqual(["effect: useEffect runs"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(effect) → UsersPage.useEffect → removeUser (changed)"])
    expect(effect?.id).toBe("src/users-page.tsx#UsersPage:useEffect@4")
  })

  it("starts the journey of a page at a visit of the path its route names", async () => {
    const files = {
      "src/users-page.tsx": codeOf("import { removeUser } from \"./users\"", "export const UsersPage = () => <b>{removeUser(1)}</b>"),
      "src/router.tsx": codeOf(
        "import { createBrowserRouter } from \"react-router\"",
        "import { UsersPage } from \"./users-page\"",
        "export const router = createBrowserRouter([{ path: \"/users\", element: <UsersPage /> }])",
      ),
    }
    const journey = await journeyOf(files, "src/users.ts", USERS_BEFORE, USERS_AFTER)

    expect(entryLabelsOf(journey)).toStrictEqual(["page-visit: A user visits /users"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(page-visit) → UsersPage → removeUser (changed)"])
  })

  it("starts at a visit of the page for a component nothing renders, and at an API call for a route", async () => {
    const page = { "src/users-page.tsx": codeOf("import { removeUser } from \"./users\"", "export const UsersPage = () => <b>{removeUser(1)}</b>") }
    const server = {
      "src/server.ts": codeOf("import express from \"express\"", "import { removeUser } from \"./users\"", "const app = express()", "app.delete(\"/users/:id\", (request) => removeUser(request.params.id))"),
    }

    expect(entryLabelsOf(await journeyOf(page, "src/users.ts", USERS_BEFORE, USERS_AFTER))).toStrictEqual(["page-visit: A user visits the page"])
    expect(entryLabelsOf(await journeyOf(server, "src/users.ts", USERS_BEFORE, USERS_AFTER))).toStrictEqual(["api-call: DELETE /users/:id"])
  })

  it("starts at the start of the app for a statement at the root of a file, and says a function nothing calls is not used yet", async () => {
    const main = { "src/main.ts": codeOf("import { removeUser } from \"./users\"", "removeUser(0)") }
    const journey = await journeyOf(main, "src/users.ts", USERS_BEFORE, USERS_AFTER)
    const [unused] = await journeysOf({ "src/users.ts": USERS_BEFORE }, { "src/users.ts": USERS_AFTER })

    expect(entryLabelsOf(journey)).toStrictEqual(["app-start: The app starts"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(app-start) → removeUser (changed)"])
    expect(listJourneyPaths(unused)).toStrictEqual(["(unused) → removeUser (changed)"])
  })

  it("gives a callback that runs on an event of a library an entry point of its own", async () => {
    const page = codeOf(
      "import { useMutation } from \"lib\"",
      "import { removeUser } from \"./users\"",
      "export const UsersPage = () => {",
      "  const { mutate } = useMutation({ onSuccess: () => removeUser(1) })",
      "  return <b>Users</b>",
      "}",
    )
    const journey = await journeyOf({ "src/users-page.tsx": page }, "src/users.ts", USERS_BEFORE, USERS_AFTER)

    expect(entryLabelsOf(journey)).toStrictEqual(["boundary: Reached through onSuccess"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(boundary) → UsersPage.onSuccess → removeUser (changed)"])
  })

  it("draws a function that only wraps a call as a node, since nothing is folded", async () => {
    const files = {
      "src/api.ts": codeOf("import { removeUser } from \"./users\"", "export const remove = (id) => removeUser(id)"),
      "src/main.ts": codeOf("import { remove } from \"./api\"", "remove(0)"),
    }

    expect(listJourneyPaths(await journeyOf(files, "src/users.ts", USERS_BEFORE, USERS_AFTER))).toStrictEqual(["(app-start) → remove → removeUser (changed)"])
  })

  it("leaves a changed component out when the change is only in what a user action runs", async () => {
    const before = codeOf("export const Page = () => {", "  return <button onClick={() => save(1)}>Save</button>", "}")
    const after = codeOf("export const Page = () => {", "  return <button onClick={() => save(2)}>Save</button>", "}")
    const [journey] = await journeysOf({ "src/page.tsx": before }, { "src/page.tsx": after })

    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → Page.onClick (changed)"])
  })

  it("marks a changed node of the shared segment as shared in the journey of each line it leads to, and names each journey after its own changes", async () => {
    const tabOf = (name: string, text: string): string => codeOf(`export const ${name} = () => <b>${text}</b>`)
    const pageOf = (title: string): string =>
      codeOf("import { TabA } from \"./tab-a\"", "import { TabB } from \"./tab-b\"", `export const Page = () => <main title="${title}"><TabA /><TabB /></main>`)
    const journeys = await journeysOf(
      { "src/page.tsx": pageOf("Tabs"), "src/tab-a.tsx": tabOf("TabA", "a"), "src/tab-b.tsx": tabOf("TabB", "b") },
      { "src/page.tsx": pageOf("All tabs"), "src/tab-a.tsx": tabOf("TabA", "one"), "src/tab-b.tsx": tabOf("TabB", "two") },
    )
    const sharedOf = (journey: JourneyFlow): string[] =>
      journey.nodes.flatMap((node) => (node.kind === "declaration" ? [`${node.declaration}: ${node.isShared ? "shared" : "own"}`] : []))

    expect(journeys.map(sharedOf)).toStrictEqual([["Page: shared", "TabA: own"], ["Page: shared", "TabB: own"]])
    expect(journeys.map((journey) => [journey.id, journey.title])).toStrictEqual([
      ["journey:src/tab-a.tsx#TabA", "TabA"],
      ["journey:src/tab-b.tsx#TabB", "TabB"],
    ])
  })

  it("follows a member of what a store function hands back to the function of that name the store declares", async () => {
    const storeOf = (added: string): string =>
      codeOf(
        "import { defineStore } from \"pinia\"",
        "export const useCartStore = defineStore(\"cart\", () => {",
        "  const addItem = (id) => {",
        `    ${added}(id)`,
        "  }",
        "  return { addItem }",
        "})",
      )
    const page = codeOf(
      "import { useCartStore } from \"./cart-store\"",
      "export const CatalogPage = () => {",
      "  const cart = useCartStore()",
      "  return <button onClick={() => cart.addItem(1)}>Add</button>",
      "}",
    )
    const journey = await journeyOf({ "src/catalog-page.tsx": page }, "src/cart-store.ts", storeOf("push"), storeOf("pushOnce"))

    expect(entryLabelsOf(journey)).toContain("user-action: A user clicks Add")
    expect(listJourneyPaths(journey)).toContain("(user-action) → CatalogPage.onClick → useCartStore (changed)")
  })

  it("draws a Vue component like a JSX component: a visit of the page, and the click that runs a handler of the script", async () => {
    const page = codeOf(
      "<script setup lang=\"ts\">",
      "import { loadUsers, removeUser } from \"./users\"",
      "const users = loadUsers()",
      "const handleDelete = (id: string) => {",
      "  removeUser(id)",
      "}",
      "</script>",
      "",
      "<template>",
      "  <button @click=\"handleDelete(users[0].id)\">Delete</button>",
      "</template>",
    )
    const usersOf = (dropped: string): string => codeOf("export const loadUsers = () => []", "export const removeUser = (id: string) => {", `  return ${dropped}(id)`, "}")
    const journey = await journeyOf({ "src/UsersPage.vue": page }, "src/users.ts", usersOf("drop"), usersOf("dropNow"))

    expect(entryLabelsOf(journey)).toStrictEqual(["user-action: A user clicks Delete"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → UsersPage.handleDelete → removeUser (changed)"])
  })

  it("follows an event a Vue component emits to the handler of the component that listens for it", async () => {
    const button = codeOf(
      "<script setup lang=\"ts\">",
      "const emit = defineEmits<{ (event: \"save\"): void }>()",
      "</script>",
      "<template>",
      "  <button @click=\"emit('save')\">Save</button>",
      "</template>",
    )
    const pageOf = (saved: string): string =>
      codeOf(
        "<script setup lang=\"ts\">",
        "import SaveButton from \"./SaveButton.vue\"",
        "const handleSave = () => {",
        `  save(${saved})`,
        "}",
        "</script>",
        "<template>",
        "  <SaveButton @save=\"handleSave\" />",
        "</template>",
      )
    const journey = await journeyOf({ "src/SaveButton.vue": button }, "src/ReviewPage.vue", pageOf("1"), pageOf("2"))
    const trigger = journey.edges.find((edge) => edge.kind === "trigger")

    expect(entryLabelsOf(journey)).toStrictEqual(["user-action: A user clicks Save"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → ReviewPage.handleSave (changed)"])
    expect(trigger?.through).toStrictEqual(["SaveButton.click"])
  })

  it("names an event a Vue component emits on after the event, as the handler node of a listener is named", async () => {
    const base = codeOf("<script setup lang=\"ts\">", "defineEmits<{ (event: \"click\"): void }>()", "</script>", "<template>", "  <button @click=\"$emit('click')\">Pay</button>", "</template>")
    const checkout = codeOf(
      "<script setup lang=\"ts\">",
      "import BaseButton from \"./BaseButton.vue\"",
      "const emit = defineEmits<{ (event: \"checkout\"): void }>()",
      "</script>",
      "<template>",
      "  <BaseButton @click=\"emit('checkout')\" />",
      "</template>",
    )
    const pageOf = (order: string): string =>
      codeOf(
        "<script setup lang=\"ts\">",
        "import CheckoutButton from \"./CheckoutButton.vue\"",
        "const handleCheckout = () => {",
        `  placeOrder(${order})`,
        "}",
        "</script>",
        "<template>",
        "  <CheckoutButton @checkout=\"handleCheckout\" />",
        "</template>",
      )
    const journey = await journeyOf({ "src/BaseButton.vue": base, "src/CheckoutButton.vue": checkout }, "src/CartPage.vue", pageOf("1"), pageOf("2"))
    const trigger = journey.edges.find((edge) => edge.kind === "trigger")

    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → CartPage.handleCheckout (changed)"])
    expect(trigger?.through).toStrictEqual(["BaseButton.click", "CheckoutButton.checkout"])
  })

  it("gives a Vue component the category ui and the name of its file", async () => {
    const pageOf = (title: string): string => codeOf("<script setup lang=\"ts\">", `const title = "${title}"`, "</script>", "<template>", "  <h1>{{ title }}</h1>", "</template>")
    const [journey] = await journeysOf({ "src/HomePage.vue": pageOf("Home") }, { "src/HomePage.vue": pageOf("Welcome") })
    const nodes = journey.nodes.flatMap((node) => (node.kind === "declaration" ? [[node.declaration, node.category, node.changeType]] : []))

    expect(nodes).toStrictEqual([["HomePage", "ui", "diff"]])
    expect(entryLabelsOf(journey)).toStrictEqual(["page-visit: A user visits the page"])
  })

  it("names the handler node of a Vue expression written in place after its event", async () => {
    const page = codeOf(
      "<script setup lang=\"ts\">",
      "import { removeUser } from \"./users\"",
      "</script>",
      "<template>",
      "  <button @click=\"removeUser('1')\">Delete</button>",
      "</template>",
    )
    const usersOf = (dropped: string): string => codeOf("export const removeUser = (id: string) => {", `  return ${dropped}(id)`, "}")
    const journey = await journeyOf({ "src/UsersPage.vue": page }, "src/users.ts", usersOf("drop"), usersOf("dropNow"))

    expect(listJourneyPaths(journey)).toStrictEqual(["(user-action) → UsersPage.click → removeUser (changed)"])
  })

  it("lists the events and the data of a Vue component, and steps through its script and its template", async () => {
    const cartOf = (label: string): string =>
      codeOf(
        "<script setup lang=\"ts\">",
        "import { formatPrice, removeItem, totalOf } from \"./cart\"",
        "const props = defineProps<{ items: Item[] }>()",
        "const total = totalOf(props.items)",
        "const handleRemove = (id: string) => removeItem(id)",
        "</script>",
        "<template>",
        "  <section>",
        "    <p>{{ formatPrice(total) }}</p>",
        `    <button v-for="item in items" :key="item.id" @click="handleRemove(item.id)">${label}</button>`,
        "  </section>",
        "</template>",
      )
    const [journey] = await journeysOf({ "src/Cart.vue": cartOf("Remove") }, { "src/Cart.vue": cartOf("Take out") })
    const cart = journey.nodes.flatMap((node) => (node.kind === "declaration" && node.declaration === "Cart" ? [node] : []))[0]

    expect(cart.events.map((event) => [event.name, event.changeType])).toStrictEqual([["button.click", "diff"]])
    expect(cart.data.map((entry) => entry.name)).toStrictEqual(["total", "items"])
    expect(cart.tracedLines.map((traced) => [traced.line, traced.isChanged])).toStrictEqual([[3, false], [4, false], [5, false], [7, false], [8, false], [9, false], [10, true]])
    expect(cart.codeViews.map((view) => [view.kind, view.lines])).toStrictEqual([
      ["data", [[4, 4]]],
      ["event", [[5, 5], [10, 10]]],
      ["render", [[7, 12]]],
    ])
  })

  it("lists the branches of a v-if chain at the root of a Vue template as the returns of the component", async () => {
    const ordersOf = (message: string): string =>
      codeOf(
        "<script setup lang=\"ts\">",
        "import OrderList from \"./OrderList.vue\"",
        "const { isPending, isError } = useOrders()",
        "</script>",
        "<template>",
        "  <p v-if=\"isPending\">Loading your orders</p>",
        `  <p v-else-if="isError">${message}</p>`,
        "  <section v-else>",
        "    <OrderList />",
        "  </section>",
        "</template>",
      )
    const list = codeOf("<template>", "  <ul></ul>", "</template>")
    const [journey] = await journeysOf({ "src/OrderList.vue": list, "src/Orders.vue": ordersOf("Failed") }, { "src/OrderList.vue": list, "src/Orders.vue": ordersOf("Your orders could not be loaded") })
    const orders = journey.nodes.flatMap((node) => (node.kind === "declaration" && node.declaration === "Orders" ? [node] : []))[0]

    expect(orders.returns.map((branch) => [branch.statement, branch.reference, branch.changeType])).toStrictEqual([
      ["v-if=\"isPending\"", [6, 6], "none"],
      ["v-else-if=\"isError\"", [7, 7], "diff"],
      ["v-else", [8, 10], "none"],
    ])
  })

  it("draws the functions of a Python file through their calls, and names the API call of a route a decorator registers", async () => {
    const pricingOf = (rate: string): string => codeOf("def price_of(line):", `    return line.price * ${rate}`)
    const files = {
      "shop/checkout.py": codeOf("from shop.pricing import price_of", "", "def total_of(cart):", "    return sum(price_of(line) for line in cart.lines)"),
      "shop/api.py": codeOf(
        "from flask import Flask",
        "from shop.checkout import total_of",
        "",
        "app = Flask(__name__)",
        "",
        "@app.get(\"/total\")",
        "def read_total():",
        "    return total_of(load_cart())",
      ),
    }
    const journey = await journeyOf(files, "shop/pricing.py", pricingOf("1"), pricingOf("2"))

    expect(entryLabelsOf(journey)).toStrictEqual(["api-call: GET /total"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(api-call) → read_total → total_of → price_of (changed)"])
  })

  it("says a Python function nothing calls is not used yet", async () => {
    const pricingOf = (rate: string): string => codeOf("def price_of(line):", `    return line.price * ${rate}`)
    const [journey] = await journeysOf({ "shop/pricing.py": pricingOf("1") }, { "shop/pricing.py": pricingOf("2") })

    expect(listJourneyPaths(journey)).toStrictEqual(["(unused) → price_of (changed)"])
  })

  it("names the route of a file a framework of the manifest reads by its path", async () => {
    const manifest = { "package.json": "{ \"dependencies\": { \"next\": \"15.0.0\" } }" }
    const pageOf = (title: string): string => codeOf("export default function UsersPage() {", `  return <h1>${title}</h1>`, "}")
    const [visited] = await journeysOf({ ...manifest, "app/users/[id]/page.tsx": pageOf("User") }, { ...manifest, "app/users/[id]/page.tsx": pageOf("A user") })
    const [unnamed] = await journeysOf({ "app/users/[id]/page.tsx": pageOf("User") }, { "app/users/[id]/page.tsx": pageOf("A user") })

    expect(entryLabelsOf(visited)).toStrictEqual(["page-visit: A user visits /users/[id]"])
    expect(entryLabelsOf(unnamed)).toStrictEqual(["page-visit: A user visits the page"])
  })

  it("names the API call of a route file by its method and its path", async () => {
    const manifest = { "package.json": "{ \"dependencies\": { \"next\": \"15.0.0\" } }" }
    const routeOf = (status: string): string => codeOf("export async function GET() {", `  return Response.json({ status: "${status}" })`, "}")
    const [journey] = await journeysOf({ ...manifest, "src/app/api/health/route.ts": routeOf("ok") }, { ...manifest, "src/app/api/health/route.ts": routeOf("up") })

    expect(entryLabelsOf(journey)).toStrictEqual(["api-call: GET /api/health"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(api-call) → GET (changed)"])
  })

  it("says an exported function of a file that starts with use server is reached by a request", async () => {
    const actionsOf = (saved: string): string => codeOf("\"use server\"", "", "export async function saveUser(user) {", `  return ${saved}(user)`, "}")
    const [journey] = await journeysOf({ "src/actions.ts": actionsOf("store") }, { "src/actions.ts": actionsOf("storeNow") })

    expect(entryLabelsOf(journey)).toStrictEqual(["api-call: POST"])
    expect(listJourneyPaths(journey)).toStrictEqual(["(api-call) → saveUser (changed)"])
  })
})
