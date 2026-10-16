import { codeOf } from "@/code-blocks/__tests__/group-fixture"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"

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
})
