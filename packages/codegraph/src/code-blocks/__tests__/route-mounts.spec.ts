import { codeOf, groupOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const nameOf = (block: StoredCodeBlock): string => block.name ?? block.type

const routePathsOf = (files: FixtureFiles): string[] =>
  groupOf(files).codeBlocks.flatMap((block) => (block.card?.routePaths === undefined ? [] : [`${nameOf(block)}: ${block.card.routePaths.join(", ")}`]))

const groupKeysOf = (files: FixtureFiles): string[] =>
  groupOf(files).codeBlocks.flatMap((block) => (block.card?.part === "holder" || block.card?.part === "handler" ? [`${nameOf(block)} ${block.card.part}: ${block.card.groupKey ?? ""}`] : []))

describe("the routes below a mount", () => {
  it("puts the prefixes of every mount above a router before its routes, outermost first", () => {
    expect(groupKeysOf({
      "server/users.ts": codeOf("import { Router } from \"express\"", "export const users = Router()", "users.get(\"/users\", listUsers)"),
      "server/api.ts": codeOf("import { Router } from \"express\"", "import { users } from \"./users\"", "export const api = Router()", "api.use(\"/v1\", users)"),
      "server/app.ts": codeOf("import express from \"express\"", "import { api } from \"./api\"", "const app = express()", "app.use(\"/api\", api)"),
    })).toStrictEqual(["route holder: /api/v1/users", "1 handler: /api/v1/users"])
  })

  it("puts the prefix before every route of a chain, the ones written after the first too", () => {
    expect(groupKeysOf({
      "server/users.ts": codeOf("import { Router } from \"express\"", "export const users = Router()", "users.route(\"/users/:id\").get(showUser).delete(removeUser)"),
      "server/app.ts": codeOf("import express from \"express\"", "import { users } from \"./users\"", "const app = express()", "app.use(\"/api\", users)"),
    })).toStrictEqual(["route holder: /api/users/:id", "route holder: /api/users/:id", "0 handler: /api/users/:id", "0 handler: /api/users/:id"])
  })

  it("takes the card of middleware off the router a mount names", () => {
    const { codeBlocks } = groupOf({
      "server/users.ts": codeOf("import { Router } from \"express\"", "export const users = Router()", "users.get(\"/users\", listUsers)"),
      "server/app.ts": codeOf("import express from \"express\"", "import { users } from \"./users\"", "const app = express()", "app.use(\"/api\", requireSession, users)"),
    })

    expect(codeBlocks.filter((block) => block.card?.part === "middleware").map(nameOf)).toStrictEqual(["1"])
  })

  it("puts the prefix of an inline Fastify plugin before the routes it registers", () => {
    expect(groupKeysOf({
      "server/app.ts": codeOf("import Fastify from \"fastify\"", "const app = Fastify()", "app.register(async (fastify) => {", "  fastify.get(\"/users\", listUsers)", "}, { prefix: \"/v1\" })"),
    })).toStrictEqual(["route holder: /v1/users", "1 handler: /v1/users"])
  })
})

describe("the routes of a Fastify plugin", () => {
  const route = "  fastify.get(\"/users\", listUsers)"

  it("reads the routes of a plugin of another file with no type, below every prefix it is registered with", () => {
    expect(groupKeysOf({
      "server/users.ts": codeOf("export default async function userRoutes(fastify) {", route, "}"),
      "server/api.ts": codeOf("import userRoutes from \"./users\"", "export default async function api(fastify) {", "  fastify.register(userRoutes, { prefix: \"/users-api\" })", "}"),
      "server/app.ts": codeOf("import Fastify from \"fastify\"", "import api from \"./api\"", "const app = Fastify()", "app.register(api, { prefix: \"/v1\" })"),
    })).toStrictEqual(["route holder: /v1/users-api/users", "1 handler: /v1/users-api/users"])
  })

  it("reads the routes of a plugin module.exports holds, required by name or in place, and the hooks of the app reach them", () => {
    const plugin = codeOf("async function userRoutes(fastify, opts) {", route, "}", "module.exports = userRoutes")
    const byName = { "server/users.ts": plugin, "server/app.ts": codeOf("const Fastify = require(\"fastify\")", "const userRoutes = require(\"./users\")", "const app = Fastify()", "app.addHook(\"onRequest\", audit)", "app.register(userRoutes, { prefix: \"/v1\" })") }
    const inPlace = {
      "server/users.ts": codeOf("module.exports = async function (fastify, opts) {", route, "}"),
      "server/app.ts": codeOf("const fastify = require(\"fastify\")({ logger: true })", "fastify.addHook(\"onRequest\", audit)", "fastify.register(require(\"./users\"), { prefix: \"/v2\" })"),
    }

    expect([...groupKeysOf(byName), ...routePathsOf(byName)]).toStrictEqual(["route holder: /v1/users", "1 handler: /v1/users", "1: /v1/users"])
    expect([...groupKeysOf(inPlace), ...routePathsOf(inPlace)]).toStrictEqual(["route holder: /v2/users", "1 handler: /v2/users", "1: /v2/users"])
  })

  it("reads the routes of a plugin whose declaration is typed FastifyPluginAsync", () => {
    expect(groupKeysOf({
      "server/users.ts": codeOf("import type { FastifyPluginAsync } from \"fastify\"", "const userRoutes: FastifyPluginAsync = async (fastify) => {", route, "}", "export default userRoutes"),
    })).toStrictEqual(["route holder: /users", "1 handler: /users"])
  })
})

describe("the route paths of middleware that runs before a whole router", () => {
  it("covers the routes of the app and of every router mounted below it", () => {
    expect(routePathsOf({
      "server/users.ts": codeOf("import { Router } from \"express\"", "export const users = Router()", "users.get(\"/users\", listUsers)"),
      "server/app.ts": codeOf(
        "import express from \"express\"",
        "import { users } from \"./users\"",
        "import { requireSession } from \"./session\"",
        "const app = express()",
        "app.use(requireSession)",
        "app.get(\"/health\", ping)",
        "app.use(\"/api\", users)",
      ),
      "server/session.ts": codeOf("export const requireSession = (req, res, next) => next()"),
    })).toStrictEqual(["0: /api/users, /health"])
  })

  it("covers only the routes below the path it is mounted at", () => {
    expect(routePathsOf({
      "server/app.ts": codeOf("import express from \"express\"", "const app = express()", "app.use(\"/admin\", requireAdmin)", "app.get(\"/admin/users\", listUsers)", "app.get(\"/health\", ping)"),
    })).toStrictEqual(["1: /admin/users"])
  })

  it("covers the routes of a blueprint for its hook, and every route of the app for its app-wide hook", () => {
    expect(routePathsOf({
      "shop/users.py": codeOf("from flask import Blueprint", "bp = Blueprint(\"users\", __name__)", "@bp.before_request", "def check():", "    pass", "@bp.before_app_request", "def load_user():", "    pass", "@bp.get(\"/users\")", "def users():", "    return []"),
      "shop/main.py": codeOf("from flask import Flask", "from shop.users import bp", "app = Flask(__name__)", "@app.get(\"/health\")", "def health():", "    return 1", "app.register_blueprint(bp, url_prefix=\"/api\")"),
    })).toStrictEqual(["check: /api/users", "load_user: /api/users, /health"])
  })

  it("covers the routes of a router for a dependency of the router, and of the included router for a dependency of the include", () => {
    expect(routePathsOf({
      "shop/main.py": codeOf(
        "from fastapi import FastAPI, APIRouter, Depends",
        "app = FastAPI()",
        "router = APIRouter(dependencies=[Depends(verify_key)])",
        "@router.get(\"/users\")",
        "async def users():",
        "    return []",
        "@app.get(\"/health\")",
        "async def health():",
        "    return 1",
        "app.include_router(router, prefix=\"/api\", dependencies=[Depends(audit)])",
      ),
    })).toStrictEqual(["0: /api/users", "0: /api/users"])
  })

  it("covers every route of an app that only includes routers, for a dependency of the app", () => {
    expect(routePathsOf({
      "shop/items.py": codeOf("from fastapi import APIRouter", "router = APIRouter()", "@router.get(\"/items\")", "async def items():", "    return []"),
      "shop/main.py": codeOf("from fastapi import FastAPI, Depends", "from shop.items import router", "app = FastAPI(dependencies=[Depends(verify_key)])", "app.include_router(router, prefix=\"/v1\")"),
    })).toStrictEqual(["0: /v1/items"])
  })
})
