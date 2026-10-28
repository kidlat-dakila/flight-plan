import { blockNamed, codeOf, groupOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { linkCards } from "@/code-blocks/card-links"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"
import type { CodeBlockType } from "@/code-blocks/types"

const DEEP_NESTING = 10_000

const cardOwnerOf = (files: FixtureFiles, type: CodeBlockType, name: string): string | null | undefined => blockNamed(groupOf(files), type, name).card?.ownerId

const nestedIdOf = (outer: StoredCodeBlock, level: number): string => `${outer.id}#nested-${String(level)}`

const nestedBetween = (outer: StoredCodeBlock, depth: number): StoredCodeBlock[] =>
  Array.from({ length: depth }, (_, level) => ({ ...outer, id: nestedIdOf(outer, level), parentBlockId: level === 0 ? outer.id : nestedIdOf(outer, level - 1), outerSymbols: [] }))

const nestedDeeply = (blocks: readonly StoredCodeBlock[], outer: StoredCodeBlock, leaf: StoredCodeBlock, depth: number): StoredCodeBlock[] => {
  const nested = nestedBetween(outer, depth)
  return [...blocks.map((block) => (block.id === leaf.id ? { ...block, parentBlockId: nested[depth - 1].id } : block)), ...nested]
}

describe("the card links of a group", () => {
  it("gives a function a route names as its handler the card of that route, with the registration as its owner", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf("import express from \"express\"", "import { listUsers } from \"./list\"", "const router = express.Router()", "router.get(\"/api/users\", listUsers)"),
      "server/list.ts": codeOf("export const listUsers = async (req, res) => {", "  res.json(await findUsers())", "}"),
    }).filter((line) => line.startsWith("listUsers"))).toStrictEqual(["listUsers: Express route handler under GET at /api/users in route"])
  })

  it("makes a value whose every key names a router a holder of no part, so it only joins them", () => {
    expect(cardsOf({
      "server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router", "export const procedure = t.procedure"),
      "server/todo.ts": codeOf("import { router, procedure } from \"./trpc\"", "export const todoRouter = router({ list: procedure.query(() => 1) })"),
      "server/root.ts": codeOf("import { router } from \"./trpc\"", "import { todoRouter } from \"./todo\"", "export const appRouter = router({ todo: todoRouter, more: { again: todoRouter } })"),
    }).filter((line) => line.startsWith("appRouter"))).toStrictEqual(["appRouter: tRPC router holder"])
  })

  it("leaves a value with a key that names no holder without a card", () => {
    expect(cardsOf({
      "server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router"),
      "server/todo.ts": codeOf("import { router } from \"./trpc\"", "export const todoRouter = router({ list: t.procedure.query(() => 1) })"),
      "server/root.ts": codeOf("import { todoRouter } from \"./todo\"", "export const routes = { todo: todoRouter, limit: 5 }"),
    }).filter((line) => line.startsWith("routes"))).toStrictEqual([])
  })

  it("leaves the card of a handler that registers itself to the registration outside it", () => {
    expect(cardOwnerOf({
      "server/routes.ts": codeOf("import express from \"express\"", "const router = express.Router()", "function a(req, res) { router.get(\"/again\", a) }", "router.get(\"/a\", a)", "export default router"),
    }, "function", "a")).toBe("server/routes.ts#route@4:1")
  })

  it("gives a handler that only registers itself the card of that route with no owner", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf("import express from \"express\"", "const router = express.Router()", "function a(req, res) { router.get(\"/again\", a) }", "export default router"),
    }).filter((line) => line.startsWith("a:"))).toStrictEqual(["a: Express route handler under GET at /again"])
  })

  it("leaves the card of a Flask view that adds its own rule to the rule outside it", () => {
    expect(cardOwnerOf({
      "app.py": codeOf("from flask import Flask", "app = Flask(__name__)", "", "def view():", "    app.add_url_rule(\"/v\", view_func=view)", "    return \"ok\"", "", "app.add_url_rule(\"/x\", view_func=view)"),
    }, "function", "view")).toBe("app.py#route@8:1")
  })

  it("gives only the first of two handlers that register each other the other as its owner", () => {
    const files = {
      "server/router.ts": codeOf("import express from \"express\"", "export const router = express.Router()"),
      "server/a.ts": codeOf("import { router } from \"./router\"", "import { b } from \"./b\"", "export function a(req, res) { router.get(\"/b\", b) }"),
      "server/b.ts": codeOf("import { router } from \"./router\"", "import { a } from \"./a\"", "export function b(req, res) { router.get(\"/a\", a) }"),
    }
    expect([cardOwnerOf(files, "function", "a"), cardOwnerOf(files, "function", "b")]).toStrictEqual([null, "server/a.ts#route@3:31"])
  })

  it("gives no card to a view method that builds the path of its own view", () => {
    expect(cardsOf({
      "views.py": codeOf("from django.urls import path", "from django.views import View", "", "class V(View):", "    def get(self, request):", "        return path(\"x/\", V.as_view())", "    def post(self, request):", "        return 1"),
    }).filter((line) => line.startsWith("V."))).toStrictEqual(["V.post: Django route handler under POST at /x in route"])
  })

  it("joins routers named at the bottom of deeply nested keys", () => {
    const group = groupOf({
      "server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router", "export const procedure = t.procedure"),
      "server/todo.ts": codeOf("import { router, procedure } from \"./trpc\"", "export const todoRouter = router({ list: procedure.query(() => 1) })"),
      "server/root.ts": codeOf("import { todoRouter } from \"./todo\"", "export const appRouter = { more: { again: todoRouter } }"),
    })
    const unlinked = group.codeBlocks.map((block) => (block.name === "appRouter" ? { ...block, card: undefined } : block))
    const deep = nestedDeeply(unlinked, blockNamed(group, "property", "more"), blockNamed(group, "property", "again"), DEEP_NESTING)
    expect(linkCards(deep).find((block) => block.name === "appRouter")?.card?.part).toBe("holder")
  })
})
