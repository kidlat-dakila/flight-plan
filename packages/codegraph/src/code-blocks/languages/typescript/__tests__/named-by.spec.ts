import { codeOf, groupOf, outlineOf } from "@/code-blocks/__tests__/group-fixture"

const cataloguedIn = (files: Readonly<Record<string, string>>, filePath: string): unknown[] =>
  groupOf(files)
    .codeBlocks.filter((block) => block.filePath === filePath && block.catalogue !== null)
    .map((block) => [block.type, block.name ?? null, block.catalogue?.name, block.catalogue?.runs, block.catalogue?.path, block.catalogue?.method])

describe("the blocks a pattern of the catalogue names", () => {
  it("makes a call a block of the type its pattern makes, with what the pattern said", () => {
    const files = {
      "src/orders.ts": codeOf(
        "import axios from \"axios\"",
        "export const loadOrders = async () => {",
        "  const response = await axios.get(\"/api/orders\")",
        "  await axios.post(\"/api/seen\", response.data)",
        "}",
      ),
    }

    expect(outlineOf(groupOf(files), "src/orders.ts")).toStrictEqual([
      "import 1:1-1:26",
      "function loadOrders 2:1-5:2",
      "  external-value response 3:3-3:50",
      "    data-fetch 3:26-3:50",
      "  request 4:9-4:47",
    ])
    expect(cataloguedIn(files, "src/orders.ts")).toStrictEqual([
      ["data-fetch", null, "default.get", null, "/api/orders", "GET"],
      ["request", null, "default.post", null, "/api/seen", "POST"],
    ])
  })

  it("makes a route of a call with a route slot, and says when each callback runs", () => {
    const files = {
      "src/server.ts": codeOf(
        "import express from \"express\"",
        "const app = express()",
        "const createUser = () => 1",
        "app.post(\"/users\", requireSession, createUser)",
      ),
    }

    expect(cataloguedIn(files, "src/server.ts")).toStrictEqual([
      ["route", null, "post", "route", "/users", "POST"],
      ["effect-callback", "1", "post", "middleware", null, null],
      ["effect-callback", "2", "post", "route", null, null],
    ])
  })

  it("follows a value a factory made into the file that exports it", () => {
    const files = {
      "src/db.ts": codeOf("import { PrismaClient } from \"@prisma/client\"", "export const prisma = new PrismaClient()"),
      "src/index.ts": codeOf("export { prisma as db } from \"./db\""),
      "src/orders.ts": codeOf("import { db } from \"./index\"", "export const listOrders = () => db.order.findMany()", "export const local = () => other.order.findMany()"),
    }

    expect(cataloguedIn(files, "src/orders.ts")).toStrictEqual([["data-fetch", null, "findMany", null, null, null]])
  })

  it("makes a code-event of a callback its pattern says runs on an event, whatever its key", () => {
    const files = {
      "src/form.ts": codeOf("import { useForm } from \"vee-validate\"", "const form = useForm({})", "export const submit = form.handleSubmit((values) => values)"),
    }

    expect(cataloguedIn(files, "src/form.ts").slice(-1)).toStrictEqual([["code-event", "0", "handleSubmit", "event", null, null]])
  })

  it("leaves the path of an element and the route of a decorated method on their blocks", () => {
    const files = {
      "src/cats.tsx": codeOf(
        "import { Controller, Get } from \"@nestjs/common\"",
        "import { Link } from \"react-router\"",
        "@Controller(\"cats\")",
        "export class CatsController {",
        "  @Get(\":id\")",
        "  findOne() {}",
        "}",
        "export const CartLink = () => <Link to=\"/cart\">Cart</Link>",
      ),
    }

    expect(cataloguedIn(files, "src/cats.tsx")).toStrictEqual([
      ["method", "CatsController.findOne", "Get", "route", "/cats/:id", "GET"],
      ["render", "Link", "Link", null, "/cart", null],
    ])
  })

  it("makes a declaration that keeps what a store hands back a state block, as the store itself is", () => {
    const files = {
      "src/store.ts": codeOf("import { create } from \"zustand\"", "export const useFilterStore = create((set) => ({ status: \"open\" }))", "export const selectStatus = (state) => state.status"),
      "src/filter.tsx": codeOf(
        "import { selectStatus, useFilterStore } from \"./store\"",
        "export const Filter = () => {",
        "  const status = useFilterStore(selectStatus)",
        "  return <b>{status}</b>",
        "}",
      ),
    }
    const group = groupOf(files)

    expect(outlineOf(group, "src/store.ts").slice(1, 2)).toStrictEqual(["state useFilterStore 2:1-2:68"])
    expect(outlineOf(group, "src/filter.tsx").slice(1, 3)).toStrictEqual(["component Filter 2:1-5:2", "  state status 3:3-3:46"])
    expect(cataloguedIn(files, "src/filter.tsx")[0]).toStrictEqual(["state", "status", "called", null, null, null])
  })

  it("makes a block of every page a route table names, at any depth, with the path of its route", () => {
    const files = {
      "src/cart.tsx": codeOf("export const CartPage = () => <b />"),
      "src/router.tsx": codeOf(
        "import { createBrowserRouter } from \"react-router\"",
        "import { CartPage } from \"./cart\"",
        "export const router = createBrowserRouter([",
        "  {",
        "    path: \"/\",",
        "    element: <CartPage />,",
        "    children: [",
        "      { path: \"cart\", Component: CartPage },",
        "      { path: \"account\", lazy: async () => import(\"./account\") },",
        "    ],",
        "  },",
        "])",
      ),
    }
    const group = groupOf(files)
    const rendered = group.codeBlocks.find((block) => block.type === "render" && block.name === "CartPage")

    expect(cataloguedIn(files, "src/router.tsx")).toStrictEqual([
      ["effect-callback", "element", "createBrowserRouter", "page", "/", null],
      ["effect-callback", "Component", "createBrowserRouter", "page", "/cart", null],
      ["effect-callback", "lazy", "createBrowserRouter", "page", "/account", null],
    ])
    expect(rendered?.outerSymbols.map((symbol) => symbol.use)).toStrictEqual(["render"])
  })
})
