import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { listJourneyNodes } from "@/journey-flow-diagram"
import type { JourneyNode } from "@flightplan/configurations"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const ROUTES = codeOf(
  "import express from \"express\"",
  "import { listUsers } from \"../controllers/users\"",
  "import { requireSession } from \"../middleware/session\"",
  "const router = express.Router()",
  "router.post(\"/api/users\", requireSession, async (req, res) => {",
  "  const user = await db.user.create({ data: req.body })",
  "  res.status(201).json(user)",
  "})",
  "router.get(\"/api/users\", listUsers)",
  "router.get(\"/api/users/:userId\", async (req, res) => {",
  "  res.json(await db.user.find(req.params.userId))",
  "})",
  "export default router",
)

const FILES = {
  "server/routes/users.ts": ROUTES,
  "server/controllers/users.ts": codeOf("export const listUsers = async (req, res) => {", "  const users = await db.user.findMany()", "  res.json(users)", "}"),
  "server/middleware/session.ts": codeOf("export const requireSession = (req, res, next) => {", "  if (!req.session) return res.status(401).end()", "  next()", "}"),
}

const CHANGES = {
  "server/routes/users.ts": [rangeAt(6, 3, 6, 56), rangeAt(11, 3, 11, 52)],
  "server/controllers/users.ts": [rangeAt(2, 3, 2, 41)],
  "server/middleware/session.ts": [rangeAt(2, 3, 2, 50)],
}

const nodeWithId = (nodes: readonly JourneyNode[], id: string): JourneyNode | undefined => listJourneyNodes(nodes).find((node) => node.id === id)

describe("the card of a route path", () => {
  it("makes one node of every registration of a path, with the handler of each inside it, and a node of its own for a child path", () => {
    const diagram = presentDiagramOf(FILES, CHANGES)

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "function requireSession (changed)",
      "route",
      "  function listUsers (changed)",
      "  effect-callback (req, res) => … (changed)",
      "route",
      "  effect-callback (req, res) => … (changed)",
    ])
    expect(diagram.journeyNodes.slice(1).map((node) => node.id)).toStrictEqual(["server/routes/users.ts#route@/api/users", "server/routes/users.ts#route@/api/users/:userId"])
  })

  it("holds every registration of the path in the route node, in the order they are written", () => {
    const diagram = presentDiagramOf(FILES, CHANGES)
    const users = nodeWithId(diagram.journeyNodes, "server/routes/users.ts#route@/api/users")

    expect(users?.codeBlocks.filter((block) => block.type === "route").map((block) => block.card?.heading)).toStrictEqual(["POST", "GET"])
  })

  it("draws a line from the middleware a registration names to the handler it runs before, and none from the route to the middleware", () => {
    const edgeIds = presentDiagramOf(FILES, CHANGES).journeyNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("server/middleware/session.ts#function@1:1 -> server/routes/users.ts#effect-callback@5:43")
    expect(edgeIds).not.toContain("server/routes/users.ts#route@/api/users -> server/middleware/session.ts#function@1:1")
  })

  it("makes no node of a slot that only names its handler", () => {
    const diagram = presentDiagramOf(FILES, { "server/controllers/users.ts": [rangeAt(2, 3, 2, 41)] })

    expect(listJourneyNodes(diagram.journeyNodes).map((node) => node.type)).not.toContain("effect-callback")
  })
})

describe("the card of a route path of a Python framework", () => {
  it("makes a route node for the path of a decorated function, with the function inside it", () => {
    const views = codeOf(
      "from flask import Flask",
      "app = Flask(__name__)",
      "@app.route(\"/users\", methods=[\"GET\", \"POST\"])",
      "def users():",
      "    return list_users()",
    )
    const diagram = presentDiagramOf({ "shop/views.py": views }, { "shop/views.py": [rangeAt(5, 5, 5, 24)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["route users", "  function users (changed)"])
    expect(diagram.journeyNodes[0].id).toBe("shop/views.py#route@/users")
  })
})

describe("the card of a route path below a mount", () => {
  it("puts the prefix a router is mounted under before the path of its routes, across files", () => {
    const users = codeOf("import { Router } from \"express\"", "const users = Router()", "users.get(\"/users\", async (req, res) => {", "  res.json(await db.user.findMany())", "})", "export default users")
    const app = codeOf("import express from \"express\"", "import users from \"./users\"", "const app = express()", "app.use(\"/api\", users)")
    const diagram = presentDiagramOf({ "server/users.ts": users, "server/app.ts": app }, { "server/users.ts": [rangeAt(4, 3, 4, 37)] })

    expect(diagram.journeyNodes.map((node) => node.id)).toStrictEqual(["server/users.ts#route@/api/users"])
  })

  it("puts the prefix of a blueprint and of an included router before their routes", () => {
    const blueprint = codeOf("from flask import Blueprint", "bp = Blueprint(\"users\", __name__)", "@bp.get(\"/users\")", "def users():", "    return list_users()")
    const flask = codeOf("from flask import Flask", "from shop.users import bp", "app = Flask(__name__)", "app.register_blueprint(bp, url_prefix=\"/api\")")
    const router = codeOf("from fastapi import APIRouter", "router = APIRouter(prefix=\"/items\")", "@router.get(\"/\")", "async def items():", "    return list_items()")
    const fastapi = codeOf("from fastapi import FastAPI", "from shop.items import router", "app = FastAPI()", "app.include_router(router, prefix=\"/v1\")")

    expect(presentDiagramOf({ "shop/users.py": blueprint, "shop/main.py": flask }, { "shop/users.py": [rangeAt(5, 5, 5, 24)] }).journeyNodes[0].id).toBe("shop/users.py#route@/api/users")
    expect(presentDiagramOf({ "shop/items.py": router, "shop/main.py": fastapi }, { "shop/items.py": [rangeAt(5, 5, 5, 24)] }).journeyNodes[0].id).toBe("shop/items.py#route@/v1/items")
  })
})

describe("the middleware of a whole app", () => {
  it("draws one line from the middleware an app uses to each route card of the app", () => {
    const app = codeOf(
      "import express from \"express\"",
      "import { requireSession } from \"./session\"",
      "const app = express()",
      "app.use(requireSession)",
      "app.get(\"/items\", async (req, res) => {",
      "  res.json(await db.item.findMany())",
      "})",
      "app.post(\"/items\", async (req, res) => {",
      "  res.json(await db.item.create(req.body))",
      "})",
    )
    const session = codeOf("export const requireSession = (req, res, next) => {", "  if (!req.session) return res.status(401).end()", "  next()", "}")
    const diagram = presentDiagramOf({ "server/app.ts": app, "server/session.ts": session }, { "server/app.ts": [rangeAt(6, 3, 6, 37), rangeAt(9, 3, 9, 42)], "server/session.ts": [rangeAt(2, 3, 2, 50)] })

    expect(diagram.journeyNodeEdges.map((edge) => edge.id).filter((id) => id.startsWith("server/session.ts"))).toStrictEqual(["server/session.ts#function@1:1 -> server/app.ts#route@/items"])
  })

  it("draws a line from a Flask hook to the routes of its blueprint, and from an app-wide hook to every route of the app", () => {
    const blueprint = codeOf(
      "from flask import Blueprint",
      "bp = Blueprint(\"users\", __name__)",
      "@bp.before_request",
      "def check_user():",
      "    return verify()",
      "@bp.before_app_request",
      "def load_user():",
      "    return find_user()",
      "@bp.get(\"/users\")",
      "def users():",
      "    return list_users()",
    )
    const app = codeOf("from flask import Flask", "from shop.users import bp", "app = Flask(__name__)", "@app.get(\"/health\")", "def health():", "    return ping()", "app.register_blueprint(bp, url_prefix=\"/api\")")
    const diagram = presentDiagramOf(
      { "shop/users.py": blueprint, "shop/main.py": app },
      { "shop/users.py": [rangeAt(5, 5, 5, 19), rangeAt(8, 5, 8, 23), rangeAt(11, 5, 11, 24)], "shop/main.py": [rangeAt(6, 5, 6, 17)] },
    )
    const hookEdges = diagram.journeyNodeEdges.map((edge) => edge.id).filter((id) => id.startsWith("shop/users.py#function@3") || id.startsWith("shop/users.py#function@6"))

    expect(hookEdges).toStrictEqual([
      "shop/users.py#function@3:1 -> shop/users.py#route@/api/users",
      "shop/users.py#function@6:1 -> shop/users.py#route@/api/users",
      "shop/users.py#function@6:1 -> shop/main.py#route@/health",
    ])
  })
})

describe("the card of a route path a view class handles", () => {
  it("puts each method of the class under the heading of its method, and leaves the class with no card", () => {
    const views = codeOf("from flask.views import MethodView", "class ItemAPI(MethodView):", "    def get(self, id):", "        return find(id)", "    def delete(self, id):", "        return remove(id)")
    const app = codeOf("from flask import Flask", "from shop.views import ItemAPI", "app = Flask(__name__)", "app.add_url_rule(\"/items/<int:id>\", view_func=ItemAPI.as_view(\"item\"))")
    const diagram = presentDiagramOf({ "shop/views.py": views, "shop/main.py": app }, { "shop/views.py": [rangeAt(4, 9, 4, 24), rangeAt(6, 9, 6, 26)] })
    const route = nodeWithId(diagram.journeyNodes, "shop/main.py#route@/items/<int:id>")

    expect(route?.children.map((child) => [child.codeBlocks[0].name, child.codeBlocks[0].card?.heading])).toStrictEqual([["ItemAPI.get", "GET"], ["ItemAPI.delete", "DELETE"]])
    expect(listJourneyNodes(diagram.journeyNodes).map((node) => node.type)).not.toContain("class")
  })
})

describe("the dependencies of a FastAPI route", () => {
  const app = codeOf(
    "from fastapi import FastAPI, APIRouter, Depends",
    "app = FastAPI()",
    "def current_user():",
    "    return find_user()",
    "def verify_key():",
    "    return check_key()",
    "router = APIRouter(dependencies=[Depends(verify_key)])",
    "@router.get(\"/users/{id}\", dependencies=[Depends(verify_key)])",
    "async def read_user(id: int, user=Depends(current_user)):",
    "    return find(id)",
    "app.include_router(router, prefix=\"/api\")",
  )
  const diagram = presentDiagramOf({ "shop/main.py": app }, { "shop/main.py": [rangeAt(4, 5, 4, 23), rangeAt(6, 5, 6, 23), rangeAt(10, 5, 10, 20)] })
  const edgeIds = diagram.journeyNodeEdges.map((edge) => edge.id)

  it("draws a line from a dependency of the route to its handler, and from a dependency of the router to the route card", () => {
    expect(edgeIds).toContain("shop/main.py#function@5:1 -> shop/main.py#function@8:1")
    expect(edgeIds).toContain("shop/main.py#function@5:1 -> shop/main.py#route@/api/users/{id}")
    expect(edgeIds).not.toContain("shop/main.py#function@8:1 -> shop/main.py#function@5:1")
  })

  it("draws a line from the handler to a dependency of one of its parameters, as to a call", () => {
    expect(edgeIds).toContain("shop/main.py#function@8:1 -> shop/main.py#function@3:1")
  })

  it("makes no node of the Depends call that only names the dependency", () => {
    expect(listJourneyNodes(diagram.journeyNodes).map((node) => node.type)).not.toContain("effect")
  })
})

describe("the plugins and hooks of Fastify", () => {
  it("reads the routes of a plugin typed FastifyInstance in another file, below the prefix it is registered with, and makes no node of a plugin that only registers routes", () => {
    const plugin = codeOf(
      "import type { FastifyInstance } from \"fastify\"",
      "export default async function userRoutes(fastify: FastifyInstance) {",
      "  fastify.get(\"/users\", async () => {",
      "    return db.user.findMany()",
      "  })",
      "}",
    )
    const app = codeOf("import Fastify from \"fastify\"", "import userRoutes from \"./plugin\"", "const app = Fastify()", "app.register(userRoutes, { prefix: \"/v1\" })")
    const diagram = presentDiagramOf({ "server/plugin.ts": plugin, "server/app.ts": app }, { "server/plugin.ts": [rangeAt(4, 5, 4, 30)] })

    expect(listJourneyNodes(diagram.journeyNodes).map((node) => node.id)).toStrictEqual(["server/plugin.ts#route@/v1/users", "server/plugin.ts#effect-callback@3:25"])
  })

  it("draws a line from a hook named in the options of a route to its handler, and from a hook of the app to the route card", () => {
    const app = codeOf(
      "import Fastify from \"fastify\"",
      "import { auth, audit } from \"./hooks\"",
      "const app = Fastify()",
      "app.addHook(\"onRequest\", audit)",
      "async function userRoutes(fastify) {",
      "  fastify.get(\"/users\", { preHandler: [auth] }, async () => {",
      "    return db.user.findMany()",
      "  })",
      "}",
      "app.register(userRoutes, { prefix: \"/v1\" })",
    )
    const hooks = codeOf("export const auth = async (request) => {", "  await verify(request)", "}", "export const audit = async (request) => {", "  await record(request)", "}")
    const diagram = presentDiagramOf({ "server/app.ts": app, "server/hooks.ts": hooks }, { "server/app.ts": [rangeAt(7, 5, 7, 30)], "server/hooks.ts": [rangeAt(2, 3, 2, 24), rangeAt(5, 3, 5, 24)] })
    const edgeIds = diagram.journeyNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("server/hooks.ts#function@1:1 -> server/app.ts#effect-callback@6:49")
    expect(edgeIds).toContain("server/hooks.ts#function@4:1 -> server/app.ts#route@/v1/users")
  })
})
