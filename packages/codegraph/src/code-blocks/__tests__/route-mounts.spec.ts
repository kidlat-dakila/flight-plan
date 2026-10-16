import { codeOf, groupOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const nameOf = (block: StoredCodeBlock): string => block.name ?? block.type

const routePathsOf = (files: FixtureFiles): string[] =>
  groupOf(files).codeBlocks.flatMap((block) => (block.card?.routePaths === undefined ? [] : [`${nameOf(block)}: ${block.card.routePaths.join(", ")}`]))

const headingsOf = (files: FixtureFiles): string[] =>
  groupOf(files).codeBlocks.flatMap((block) => (block.card?.part === "handler" ? [`${nameOf(block)}: ${block.card.heading ?? ""}`] : []))

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

const NEST_USERS = codeOf(
  "import { Controller, Get, Post, UseGuards, Version } from \"@nestjs/common\"",
  "import { AuthGuard } from \"./auth.guard\"",
  "@UseGuards(AuthGuard)",
  "@Controller({ path: \"users\", version: \"1\" })",
  "export class UsersController {",
  "  @Get()",
  "  findAll() {",
  "    return []",
  "  }",
  "  @Version(\"2\")",
  "  @Post(\":id\")",
  "  save() {",
  "    return 1",
  "  }",
  "}",
)

const NEST_FILES: FixtureFiles = {
  "src/users/users.controller.ts": NEST_USERS,
  "src/users/users.module.ts": codeOf(
    "import { Module } from \"@nestjs/common\"",
    "import { UsersController } from \"./users.controller\"",
    "@Module({ controllers: [UsersController] })",
    "export class UsersModule {}",
  ),
  "src/auth.guard.ts": codeOf("export class AuthGuard {}"),
  "src/roles.guard.ts": codeOf("export class RolesGuard {}"),
  "src/logger.middleware.ts": codeOf("export class LoggerMiddleware {}"),
  "src/health.controller.ts": codeOf("import { Controller, Get } from \"@nestjs/common\"", "@Controller(\"health\")", "export class HealthController {", "  @Get()", "  check() {", "    return 1", "  }", "}"),
  "src/app.module.ts": codeOf(
    "import { MiddlewareConsumer, Module } from \"@nestjs/common\"",
    "import { APP_GUARD, RouterModule } from \"@nestjs/core\"",
    "import { UsersModule } from \"./users/users.module\"",
    "import { HealthController } from \"./health.controller\"",
    "import { LoggerMiddleware } from \"./logger.middleware\"",
    "import { RolesGuard } from \"./roles.guard\"",
    "@Module({",
    "  imports: [UsersModule, RouterModule.register([{ path: \"admin\", module: UsersModule }])],",
    "  controllers: [HealthController],",
    "  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],",
    "})",
    "export class AppModule {",
    "  configure(consumer: MiddlewareConsumer) {",
    "    consumer.apply(LoggerMiddleware).forRoutes(\"admin/*\")",
    "  }",
    "}",
  ),
  "src/main.ts": codeOf(
    "import { NestFactory } from \"@nestjs/core\"",
    "import { AppModule } from \"./app.module\"",
    "const app = await NestFactory.create(AppModule)",
    "app.setGlobalPrefix(\"api\", { exclude: [\"health\"] })",
    "app.enableVersioning({ type: VersioningType.URI })",
  ),
}

describe("the routes of a Nest app", () => {
  it("puts the global prefix, the version and the path RouterModule gives a module before each route of its controllers, and no global prefix before a path it excludes", () => {
    expect(groupKeysOf(NEST_FILES)).toStrictEqual([
      "UsersController.findAll handler: /api/v1/admin/users",
      "UsersController.save handler: /api/v2/admin/users/:id",
      "HealthController.check handler: /health",
    ])
  })

  it("puts the path RouterModule gives a module before the routes of its own controllers only, not of the modules it imports", () => {
    const files = {
      ...NEST_FILES,
      "src/users/users.module.ts": NEST_FILES["src/users/users.module.ts"].replace("@Module({ controllers: [UsersController] })", "@Module({ imports: [TagsModule], controllers: [UsersController] })").replace("export class UsersModule", "import { TagsModule } from \"../tags.module\"\nexport class UsersModule"),
      "src/tags.module.ts": codeOf(
        "import { Controller, Get, Module } from \"@nestjs/common\"",
        "@Controller(\"tags\")",
        "export class TagsController {",
        "  @Get()",
        "  list() {",
        "    return []",
        "  }",
        "}",
        "@Module({ controllers: [TagsController] })",
        "export class TagsModule {}",
      ),
    }

    expect(groupKeysOf(files)).toContain("TagsController.list handler: /api/tags")
  })

  it("puts no version before a route when the app versions by header, and names the version in the heading of its handler instead", () => {
    const files = { ...NEST_FILES, "src/main.ts": NEST_FILES["src/main.ts"].replace("VersioningType.URI", "VersioningType.HEADER") }

    expect(groupKeysOf(files)).toContain("UsersController.findAll handler: /api/admin/users")
    expect(headingsOf(files)).toStrictEqual(["UsersController.findAll: GET v1", "UsersController.save: POST v2", "HealthController.check: GET"])
  })

  it("names the default version in the heading of a handler with none of its own, when the app versions by media type", () => {
    const files = {
      ...NEST_FILES,
      "src/main.ts": NEST_FILES["src/main.ts"].replace("{ type: VersioningType.URI }", "{ type: VersioningType.MEDIA_TYPE, key: \"v=\", defaultVersion: \"3\" }"),
    }

    expect(headingsOf(files)).toContain("HealthController.check: GET v3")
  })

  it("puts every version of a list in one segment, and none for a route that is VERSION_NEUTRAL, whatever its controller or the app's default says", () => {
    const files = {
      ...NEST_FILES,
      "src/users/users.controller.ts": NEST_USERS.replace("@Version(\"2\")", "@Version([\"2\", \"3\"])").replace("  @Get()", "  @Version(VERSION_NEUTRAL)\n  @Get()"),
      "src/main.ts": NEST_FILES["src/main.ts"].replace("{ type: VersioningType.URI }", "{ type: VersioningType.URI, defaultVersion: \"1\" }"),
    }

    expect(groupKeysOf(files)).toStrictEqual([
      "UsersController.findAll handler: /api/admin/users",
      "UsersController.save handler: /api/v2|v3/admin/users/:id",
      "HealthController.check handler: /v1/health",
    ])
  })

  it("leaves out of the global prefix only the handlers of the method an exclusion names", () => {
    const files = {
      "src/users.controller.ts": codeOf(
        "import { Controller, Get, Post } from \"@nestjs/common\"",
        "@Controller(\"users\")",
        "export class UsersController {",
        "  @Get()",
        "  list() {",
        "    return []",
        "  }",
        "  @Post()",
        "  create() {",
        "    return 1",
        "  }",
        "}",
      ),
      "src/main.ts": codeOf(
        "import { NestFactory } from \"@nestjs/core\"",
        "const app = await NestFactory.create(AppModule)",
        "app.setGlobalPrefix(\"api\", { exclude: [{ path: \"users\", method: RequestMethod.GET }] })",
      ),
    }

    expect(groupKeysOf(files)).toStrictEqual(["UsersController.list handler: /users", "UsersController.create handler: /api/users"])
  })

  it("covers the routes of a controller for its guard, every route for a guard the app provides, and the routes a consumer chooses by path below the global prefix", () => {
    expect(routePathsOf(NEST_FILES)).toStrictEqual([
      "0: /api/v1/admin/users, /api/v2/admin/users/:id",
      "useClass: /api/v1/admin/users, /api/v2/admin/users/:id, /health",
      "0: /api/v1/admin/users, /api/v2/admin/users/:id",
    ])
  })

  it("leaves out a route a consumer excludes by method only when every handler of its path has that method", () => {
    const files = {
      ...NEST_FILES,
      "src/app.module.ts": NEST_FILES["src/app.module.ts"].replace("forRoutes(\"admin/*\")", "exclude({ path: \"admin/users\", method: RequestMethod.GET }, { path: \"admin/users/:id\", method: RequestMethod.GET }).forRoutes(\"admin/*\")"),
    }

    expect(routePathsOf(files).slice(-1)).toStrictEqual(["0: /api/v2/admin/users/:id"])
  })

  it("covers only the routes with a handler of the method a consumer chooses a path for", () => {
    const files = {
      ...NEST_FILES,
      "src/app.module.ts": NEST_FILES["src/app.module.ts"].replace("forRoutes(\"admin/*\")", "forRoutes({ path: \"admin/users\", method: RequestMethod.GET }, { path: \"admin/users/:id\", method: RequestMethod.GET })"),
    }

    expect(routePathsOf(files).slice(-1)).toStrictEqual(["0: /api/v1/admin/users"])
  })

  it("covers the routes of a controller a consumer names, and leaves out those it excludes", () => {
    const files = { ...NEST_FILES, "src/app.module.ts": NEST_FILES["src/app.module.ts"].replace("forRoutes(\"admin/*\")", "exclude(\"health\").forRoutes(HealthController, UsersController)").replace("import { MiddlewareConsumer", "import { UsersController } from \"./users/users.controller\"\nimport { MiddlewareConsumer") }

    expect(routePathsOf(files).slice(-1)).toStrictEqual(["0: /api/v1/admin/users, /api/v2/admin/users/:id"])
  })
})
