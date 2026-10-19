import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { listTraceNodes } from "@/trace-diagram"
import type { TraceNode } from "@flightplan/configurations"
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

const nodeWithId = (nodes: readonly TraceNode[], id: string): TraceNode | undefined => listTraceNodes(nodes).find((node) => node.id === id)

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
    expect(diagram.traceNodes.slice(1).map((node) => node.id)).toStrictEqual(["server/routes/users.ts#route@/api/users", "server/routes/users.ts#route@/api/users/:userId"])
  })

  it("holds every registration of the path in the route node, in the order they are written", () => {
    const diagram = presentDiagramOf(FILES, CHANGES)
    const users = nodeWithId(diagram.traceNodes, "server/routes/users.ts#route@/api/users")

    expect(users?.codeBlocks.filter((block) => block.type === "route").map((block) => block.card?.heading)).toStrictEqual(["POST", "GET"])
  })

  it("draws a line from the middleware a registration names to the handler it runs before, and none from the route to the middleware", () => {
    const edgeIds = presentDiagramOf(FILES, CHANGES).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("server/middleware/session.ts#function@1:1 -> server/routes/users.ts#effect-callback@5:43")
    expect(edgeIds).not.toContain("server/routes/users.ts#route@/api/users -> server/middleware/session.ts#function@1:1")
  })

  it("makes no node of a slot that only names its handler", () => {
    const diagram = presentDiagramOf(FILES, { "server/controllers/users.ts": [rangeAt(2, 3, 2, 41)] })

    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("effect-callback")
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
    expect(diagram.traceNodes[0].id).toBe("shop/views.py#route@/users")
  })
})

const NEXT_FILES = {
  "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
  "app/api/users/[id]/route.ts": codeOf(
    "export async function GET(request, { params }) {",
    "  return Response.json(await db.user.find(params.id))",
    "}",
    "export async function DELETE(request, { params }) {",
    "  await db.user.delete(params.id)",
    "}",
  ),
  "pages/api/posts.ts": codeOf("export default async function handler(req, res) {", "  res.json(await db.post.findMany())", "}"),
  "app/actions.ts": codeOf("\"use server\"", "export async function createUser(formData) {", "  await db.user.create(formData)", "}"),
}

const NEXT_CHANGES = {
  "app/api/users/[id]/route.ts": [rangeAt(2, 3, 2, 54), rangeAt(5, 3, 5, 33)],
  "pages/api/posts.ts": [rangeAt(2, 3, 2, 38)],
  "app/actions.ts": [rangeAt(3, 3, 3, 33)],
}

describe("the card of a Next.js route file", () => {
  it("makes one route node of the methods a route file exports and of an API page, and leaves a server action a node of its own", () => {
    const diagram = presentDiagramOf(NEXT_FILES, NEXT_CHANGES)

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "route GET",
      "  function GET (changed)",
      "  function DELETE (changed)",
      "route handler",
      "  function handler (changed)",
      "function createUser (changed)",
    ])
    expect(diagram.traceNodes.map((node) => node.id)).toStrictEqual([
      "app/api/users/[id]/route.ts#route@/api/users/[id]",
      "pages/api/posts.ts#route@/api/posts",
      "app/actions.ts#function@2:1",
    ])
  })
})

describe("a server action a page hands to a form", () => {
  it("draws a line from the action and formAction of the page to each server action they name", () => {
    const files = {
      "app/actions.ts": codeOf("\"use server\"", "export async function createUser(formData) {", "  await db.user.create(formData)", "}", "export async function renameUser(formData) {", "  await db.user.update(formData)", "}"),
      "app/users/page.tsx": codeOf(
        "import { createUser, renameUser } from \"../actions\"",
        "export default function UsersPage() {",
        "  return <form action={createUser}><button formAction={renameUser}>Rename</button></form>",
        "}",
      ),
    }
    const edgeIds = presentDiagramOf(files, { "app/actions.ts": [rangeAt(3, 3, 3, 33), rangeAt(6, 3, 6, 33)] }).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("app/users/page.tsx#render-event@3:16 -> app/actions.ts#function@2:1")
    expect(edgeIds).toContain("app/users/page.tsx#render-event@3:44 -> app/actions.ts#function@5:1")
  })
})

const middlewareFilesOf = (config: string) => ({
  "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }),
  "middleware.ts": codeOf("export function middleware(request) {", "  return checkSession(request)", "}", config),
  "app/api/users/route.ts": codeOf("export async function GET() {", "  return Response.json(await db.user.findMany())", "}"),
  "app/api/health/route.ts": codeOf("export async function GET() {", "  return Response.json(await ping())", "}"),
  "app/dashboard/[team]/page.tsx": codeOf("export default function DashboardPage() {", "  const team = useTeam()", "  return <h1>{team}</h1>", "}"),
  "app/dashboard/layout.tsx": codeOf("export default function DashboardLayout({ children }) {", "  const nav = useNav()", "  return <main>{nav}{children}</main>", "}"),
  "app/page.tsx": codeOf("export default function HomePage() {", "  const user = useUser()", "  return <h1>{user}</h1>", "}"),
})

const MIDDLEWARE_CHANGES = {
  "middleware.ts": [rangeAt(2, 3, 2, 31)],
  "app/api/users/route.ts": [rangeAt(2, 3, 2, 50)],
  "app/api/health/route.ts": [rangeAt(2, 3, 2, 40)],
  "app/dashboard/[team]/page.tsx": [rangeAt(2, 3, 2, 25)],
  "app/dashboard/layout.tsx": [rangeAt(2, 3, 2, 23)],
  "app/page.tsx": [rangeAt(2, 3, 2, 25)],
}

const middlewareTargetsOf = (config: string): string[] =>
  presentDiagramOf(middlewareFilesOf(config), MIDDLEWARE_CHANGES).traceNodeEdges
    .filter((edge) => edge.id.startsWith("middleware.ts#"))
    .map((edge) => edge.id.slice(edge.id.indexOf(" -> ") + " -> ".length))

describe("the middleware of a Next.js app", () => {
  it("draws a line to every route card and every page with no matcher, and none to a layout", () => {
    expect(middlewareTargetsOf("")).toStrictEqual([
      "app/api/users/route.ts#route@/api/users",
      "app/api/health/route.ts#route@/api/health",
      "app/dashboard/[team]/page.tsx#component@1:1",
      "app/page.tsx#component@1:1",
    ])
  })

  it("draws a line only to the route cards and pages its matcher reaches", () => {
    expect(middlewareTargetsOf("export const config = { matcher: [\"/dashboard/:path*\", \"/api/users\"] }")).toStrictEqual([
      "app/api/users/route.ts#route@/api/users",
      "app/dashboard/[team]/page.tsx#component@1:1",
    ])
    expect(middlewareTargetsOf("export const config = { matcher: \"/((?!api|_next/static).*)\" }")).toStrictEqual([
      "app/dashboard/[team]/page.tsx#component@1:1",
      "app/page.tsx#component@1:1",
    ])
  })
})

describe("the card of a route path below a mount", () => {
  it("puts the prefix a router is mounted under before the path of its routes, across files", () => {
    const users = codeOf("import { Router } from \"express\"", "const users = Router()", "users.get(\"/users\", async (req, res) => {", "  res.json(await db.user.findMany())", "})", "export default users")
    const app = codeOf("import express from \"express\"", "import users from \"./users\"", "const app = express()", "app.use(\"/api\", users)")
    const diagram = presentDiagramOf({ "server/users.ts": users, "server/app.ts": app }, { "server/users.ts": [rangeAt(4, 3, 4, 37)] })

    expect(diagram.traceNodes.map((node) => node.id)).toStrictEqual(["server/users.ts#route@/api/users"])
  })

  it("puts the prefix of a blueprint and of an included router before their routes", () => {
    const blueprint = codeOf("from flask import Blueprint", "bp = Blueprint(\"users\", __name__)", "@bp.get(\"/users\")", "def users():", "    return list_users()")
    const flask = codeOf("from flask import Flask", "from shop.users import bp", "app = Flask(__name__)", "app.register_blueprint(bp, url_prefix=\"/api\")")
    const router = codeOf("from fastapi import APIRouter", "router = APIRouter(prefix=\"/items\")", "@router.get(\"/\")", "async def items():", "    return list_items()")
    const fastapi = codeOf("from fastapi import FastAPI", "from shop.items import router", "app = FastAPI()", "app.include_router(router, prefix=\"/v1\")")

    expect(presentDiagramOf({ "shop/users.py": blueprint, "shop/main.py": flask }, { "shop/users.py": [rangeAt(5, 5, 5, 24)] }).traceNodes[0].id).toBe("shop/users.py#route@/api/users")
    expect(presentDiagramOf({ "shop/items.py": router, "shop/main.py": fastapi }, { "shop/items.py": [rangeAt(5, 5, 5, 24)] }).traceNodes[0].id).toBe("shop/items.py#route@/v1/items")
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

    expect(diagram.traceNodeEdges.map((edge) => edge.id).filter((id) => id.startsWith("server/session.ts"))).toStrictEqual(["server/session.ts#function@1:1 -> server/app.ts#route@/items"])
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
    const hookEdges = diagram.traceNodeEdges.map((edge) => edge.id).filter((id) => id.startsWith("shop/users.py#function@3") || id.startsWith("shop/users.py#function@6"))

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
    const route = nodeWithId(diagram.traceNodes, "shop/main.py#route@/items/<int:id>")

    expect(route?.children.map((child) => [child.codeBlocks[0].name, child.codeBlocks[0].card?.heading])).toStrictEqual([["ItemAPI.get", "GET"], ["ItemAPI.delete", "DELETE"]])
    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("class")
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
  const edgeIds = diagram.traceNodeEdges.map((edge) => edge.id)

  it("draws a line from a dependency of the route to its handler, and from a dependency of the router to the route card", () => {
    expect(edgeIds).toContain("shop/main.py#function@5:1 -> shop/main.py#function@8:1")
    expect(edgeIds).toContain("shop/main.py#function@5:1 -> shop/main.py#route@/api/users/{id}")
    expect(edgeIds).not.toContain("shop/main.py#function@8:1 -> shop/main.py#function@5:1")
  })

  it("draws a line from the handler to a dependency of one of its parameters, as to a call", () => {
    expect(edgeIds).toContain("shop/main.py#function@8:1 -> shop/main.py#function@3:1")
  })

  it("makes no node of the Depends call that only names the dependency", () => {
    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("effect")
  })

  it("draws a line from the router a route is registered on to its route card, and none back from the handler", () => {
    const items = codeOf(
      "from fastapi import APIRouter",
      "LIMIT = 20",
      "router = APIRouter(prefix=\"/items\")",
      "@router.get(\"/\")",
      "async def items():",
      "    return list_items(LIMIT)",
      "@router.post(\"/\")",
      "async def add_item():",
      "    return save_item()",
    )
    const express = codeOf("import express from \"express\"", "const router = express.Router()", "router.get(\"/users\", async (req, res) => {", "  res.json(await listUsers())", "})", "export default router")
    const decorated = presentDiagramOf({ "shop/items.py": items }, { "shop/items.py": [rangeAt(1, 1, 9, 23)] })
    const called = presentDiagramOf({ "server/users.ts": express }, { "server/users.ts": [rangeAt(1, 1, 6, 22)] })

    expect(decorated.traceNodeEdges.map((edge) => edge.id).filter((id) => id.includes("root-variable@3:1"))).toStrictEqual(["shop/items.py#root-variable@3:1 -> shop/items.py#route@/items"])
    expect(called.traceNodeEdges.map((edge) => edge.id).filter((id) => id.includes("root-variable@2:1"))).toStrictEqual(["server/users.ts#root-variable@2:1 -> server/users.ts#route@/users"])
  })

  it("draws the line from the router whatever the layout, and keeps the line from a handler to any other value it reads", () => {
    const wholeOf = (code: string) => [rangeAt(1, 1, code.split("\n").length, 80)]
    const routerEdgesOf = (files: Record<string, string>, routerId: string): string[] => {
      const changedDiagram = presentDiagramOf(files, Object.fromEntries(Object.entries(files).map(([path, code]) => [path, wholeOf(code)])))
      return changedDiagram.traceNodeEdges.map((edge) => edge.id).filter((id) => id.includes(routerId))
    }
    const stacked = codeOf(
      "from fastapi import APIRouter",
      "from slowapi import Limiter",
      "limiter = Limiter(key_func=client_ip)",
      "cache = make_cache()",
      "router = APIRouter(prefix=\"/items\")",
      "@router.get(\"/\")",
      "@limiter.limit(\"5/minute\")",
      "async def items():",
      "    return cache.read()",
    )

    expect(routerEdgesOf({ "shop/main.py": codeOf("from fastapi import FastAPI", "app = FastAPI()", "@app.get(\"/health\")", "async def health():", "    return check()") }, "root-variable@2:1"))
      .toStrictEqual(["shop/main.py#root-variable@2:1 -> shop/main.py#route@/health"])
    expect(routerEdgesOf({ "shop/users.py": codeOf("from flask import Blueprint", "bp = Blueprint(\"users\", __name__)", "@bp.get(\"/users\")", "def users():", "    return list_users()") }, "root-variable@2:1"))
      .toStrictEqual(["shop/users.py#root-variable@2:1 -> shop/users.py#route@/users"])
    expect(routerEdgesOf({ "shop/items.py": stacked }, "root-variable@")).toStrictEqual([
      "shop/items.py#function@6:1 -> shop/items.py#root-variable@3:1",
      "shop/items.py#function@6:1 -> shop/items.py#root-variable@4:1",
      "shop/items.py#root-variable@5:1 -> shop/items.py#route@/items",
    ])
    expect(routerEdgesOf({
      "shop/api.py": codeOf("from fastapi import APIRouter", "router = APIRouter(prefix=\"/items\")"),
      "shop/items.py": codeOf("from shop.api import router", "@router.get(\"/\")", "async def items():", "    return list_items()"),
    }, "root-variable@2:1")).toStrictEqual(["shop/api.py#root-variable@2:1 -> shop/items.py#route@/items"])
    expect(routerEdgesOf({
      "server/router.ts": codeOf("import { Router } from \"express\"", "export const router = Router()"),
      "server/users.ts": codeOf("import { router } from \"./router\"", "router.get(\"/users\", async (req, res) => {", "  res.json(await listUsers())", "})"),
    }, "root-variable@2:1")).toStrictEqual(["server/router.ts#root-variable@2:1 -> server/users.ts#route@/users"])
  })

  it("draws no line between a router the change leaves alone and the routes it changes", () => {
    const items = codeOf("from fastapi import APIRouter", "router = APIRouter(prefix=\"/items\")", "@router.get(\"/\")", "async def items():", "    return list_items()")
    const handlerOnly = presentDiagramOf({ "shop/items.py": items }, { "shop/items.py": [rangeAt(5, 5, 5, 24)] })

    expect(handlerOnly.traceNodeEdges).toStrictEqual([])
  })

  it("makes no node of an include that only hands a dependency, and draws the dependency's line to the route card", () => {
    const items = codeOf("from fastapi import APIRouter", "router = APIRouter(prefix=\"/items\")", "@router.get(\"/\")", "async def items():", "    return list_items()")
    const main = codeOf(
      "from fastapi import FastAPI, Depends",
      "from shop.items import router",
      "def verify_key():",
      "    return check_key()",
      "app = FastAPI()",
      "app.include_router(router, prefix=\"/v1\", dependencies=[Depends(verify_key)])",
    )
    const included = presentDiagramOf({ "shop/items.py": items, "shop/main.py": main }, { "shop/items.py": [rangeAt(5, 5, 5, 24)], "shop/main.py": [rangeAt(4, 5, 4, 23), rangeAt(6, 1, 6, 80)] })

    expect(listTraceNodes(included.traceNodes).map((node) => node.id)).toStrictEqual(["shop/items.py#route@/v1/items", "shop/items.py#function@3:1", "shop/main.py#function@3:1"])
    expect(included.traceNodeEdges.map((edge) => edge.id)).toStrictEqual(["shop/main.py#function@3:1 -> shop/items.py#route@/v1/items"])
  })
})

describe("the Annotated dependencies of a FastAPI route", () => {
  it("draws a line from a handler to a dependency it names in Annotated, from a dependency to its own, and to the class Annotated names for an empty Depends", () => {
    const app = codeOf(
      "from typing import Annotated",
      "from fastapi import FastAPI, Depends",
      "app = FastAPI()",
      "def get_db():",
      "    yield open_session()",
      "def current_user(db: Annotated[Session, Depends(get_db)]):",
      "    return find_user(db)",
      "class Pagination:",
      "    def window(self):",
      "        return slice_of(self)",
      "@app.get(\"/items\")",
      "async def read_items(user: Annotated[User, Depends(current_user)], page: Annotated[Pagination, Depends()]):",
      "    return list_items(user, page)",
    )
    const diagram = presentDiagramOf({ "shop/main.py": app }, { "shop/main.py": [rangeAt(5, 5, 5, 25), rangeAt(7, 5, 7, 25), rangeAt(10, 9, 10, 30), rangeAt(13, 5, 13, 34)] })
    const edgeIds = diagram.traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("shop/main.py#function@11:1 -> shop/main.py#function@6:1")
    expect(edgeIds).toContain("shop/main.py#function@6:1 -> shop/main.py#function@4:1")
    expect(edgeIds).toContain("shop/main.py#function@11:1 -> shop/main.py#class@8:1")
  })

  it("makes no card of an Annotated alias, and draws a line from a handler typed by it to the dependency it names, across files", () => {
    const deps = codeOf(
      "from typing import Annotated",
      "from fastapi import Depends",
      "def get_db():",
      "    yield open_session()",
      "SessionDep = Annotated[Session, Depends(get_db)]",
      "def current_user(db: SessionDep):",
      "    return find_user(db)",
      "CurrentUser = Annotated[User, Depends(current_user)]",
    )
    const routes = codeOf(
      "from fastapi import APIRouter",
      "from shop.deps import CurrentUser, SessionDep",
      "router = APIRouter()",
      "@router.get(\"/me\")",
      "async def read_me(user: CurrentUser, db: SessionDep):",
      "    return list_me(user, db)",
    )
    const diagram = presentDiagramOf({ "shop/deps.py": deps, "shop/routes.py": routes }, { "shop/deps.py": [rangeAt(4, 5, 4, 25)], "shop/routes.py": [rangeAt(6, 5, 6, 29)] })

    expect(listTraceNodes(diagram.traceNodes).map((node) => node.id)).toStrictEqual([
      "shop/routes.py#route@/me",
      "shop/routes.py#function@4:1",
      "shop/deps.py#function@6:1",
      "shop/deps.py#function@3:1",
    ])
    expect(diagram.traceNodeEdges.map((edge) => edge.id)).toStrictEqual([
      "shop/routes.py#function@4:1 -> shop/deps.py#function@6:1",
      "shop/routes.py#function@4:1 -> shop/deps.py#function@3:1",
      "shop/deps.py#function@6:1 -> shop/deps.py#function@3:1",
    ])
  })
})

describe("the middleware classes and mounted apps of FastAPI", () => {
  it("draws a line from a middleware class the app adds to each route card of the app", () => {
    const app = codeOf(
      "from fastapi import FastAPI",
      "app = FastAPI()",
      "class TimingMiddleware:",
      "    async def dispatch(self, request, call_next):",
      "        return await time_call(call_next, request)",
      "app.add_middleware(TimingMiddleware)",
      "@app.get(\"/home\")",
      "async def home():",
      "    return read_home()",
    )
    const edgeIds = presentDiagramOf({ "shop/main.py": app }, { "shop/main.py": [rangeAt(5, 9, 5, 50), rangeAt(9, 5, 9, 23)] }).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("shop/main.py#class@3:1 -> shop/main.py#route@/home")
  })

  it("puts the path of a mount before the routes of the mounted app, which the middleware of the app reaches but not its dependencies", () => {
    const app = codeOf(
      "from fastapi import FastAPI, Depends",
      "def verify_key():",
      "    return check_key()",
      "app = FastAPI(dependencies=[Depends(verify_key)])",
      "admin = FastAPI()",
      "@app.middleware(\"http\")",
      "async def timing(request, call_next):",
      "    return await time_call(call_next, request)",
      "@admin.middleware(\"http\")",
      "async def audit(request, call_next):",
      "    return record(request)",
      "@admin.get(\"/stats\")",
      "async def stats():",
      "    return read_stats()",
      "@app.get(\"/home\")",
      "async def home():",
      "    return read_home()",
      "app.mount(\"/admin\", admin)",
    )
    const diagram = presentDiagramOf({ "shop/main.py": app }, { "shop/main.py": [rangeAt(3, 5, 3, 22), rangeAt(8, 5, 8, 46), rangeAt(11, 5, 11, 27), rangeAt(14, 5, 14, 24), rangeAt(17, 5, 17, 23)] })
    const routeEdgeIds = diagram.traceNodeEdges.map((edge) => edge.id).filter((edgeId) => edgeId.includes("#route@"))

    expect([...routeEdgeIds].sort()).toStrictEqual([
      "shop/main.py#function@2:1 -> shop/main.py#route@/home",
      "shop/main.py#function@6:1 -> shop/main.py#route@/admin/stats",
      "shop/main.py#function@6:1 -> shop/main.py#route@/home",
      "shop/main.py#function@9:1 -> shop/main.py#route@/admin/stats",
    ])
  })

  it("makes no card of an app that only hands its dependencies", () => {
    const app = codeOf(
      "from fastapi import FastAPI, Depends",
      "def verify_key():",
      "    return check_key()",
      "app = FastAPI(dependencies=[Depends(verify_key)])",
      "@app.get(\"/home\")",
      "async def home():",
      "    return read_home()",
    )
    const diagram = presentDiagramOf({ "shop/main.py": app }, { "shop/main.py": [rangeAt(3, 5, 3, 22), rangeAt(7, 5, 7, 23)] })

    expect(listTraceNodes(diagram.traceNodes).map((node) => node.id)).toStrictEqual(["shop/main.py#route@/home", "shop/main.py#function@5:1", "shop/main.py#function@2:1"])
    expect(diagram.traceNodeEdges.map((edge) => edge.id)).toStrictEqual(["shop/main.py#function@2:1 -> shop/main.py#route@/home"])
  })
})

describe("the route cards of Django", () => {
  const views = codeOf(
    "from django.views import View",
    "from django.views.generic import ListView",
    "from django.contrib.auth.decorators import login_required",
    "from django.views.decorators.http import require_POST, require_http_methods",
    "def user_list(request):",
    "    return render_users(request)",
    "@login_required",
    "@require_POST",
    "def user_create(request):",
    "    return save_user(request)",
    "@require_http_methods([\"GET\", \"POST\"])",
    "def user_detail(request, pk):",
    "    return find_user(pk)",
    "class AboutView(View):",
    "    def get(self, request):",
    "        return show_about()",
    "    def post(self, request):",
    "        return save_about()",
    "class TeamList(ListView):",
    "    def get_queryset(self):",
    "        return active_teams()",
  )
  const urls = codeOf(
    "from django.urls import path, re_path",
    "from shop.views import user_list, user_create, user_detail, AboutView, TeamList",
    "urlpatterns = [",
    "    path(\"users/\", user_list, name=\"users\"),",
    "    path(\"users/new/\", user_create),",
    "    path(\"users/<int:pk>/\", user_detail),",
    "    path(\"about/\", AboutView.as_view()),",
    "    path(\"teams/\", TeamList.as_view()),",
    "    re_path(r\"^legacy/(?P<slug>[-\\w]+)/$\", user_list),",
    "]",
  )
  const diagram = presentDiagramOf({ "shop/views.py": views, "shop/urls.py": urls }, {
    "shop/views.py": [rangeAt(6, 5, 6, 32), rangeAt(10, 5, 10, 29), rangeAt(13, 5, 13, 25), rangeAt(16, 9, 16, 28), rangeAt(18, 9, 18, 28), rangeAt(21, 9, 21, 30)],
  })

  it("makes a route card of each path, from the root and with no slash at its end, and no card of the urlpatterns that only lists them", () => {
    expect(outlineOfNodes(diagram)).toStrictEqual([
      "route",
      "  class TeamList (changed)",
      "    method TeamList.get_queryset (changed)",
      "route",
      "  function user_list (changed)",
      "route",
      "  function user_create (changed)",
      "route",
      "  function user_detail (changed)",
      "route",
      "route  (changed)",
      "  method AboutView.get (changed)",
      "  method AboutView.post (changed)",
    ])
    expect(diagram.traceNodes.map((node) => node.id)).toStrictEqual([
      "shop/urls.py#route@/teams",
      "shop/urls.py#route@/users",
      "shop/urls.py#route@/users/new",
      "shop/urls.py#route@/users/<int:pk>",
      "shop/urls.py#route@/legacy/(?P<slug>[-\\w]+)",
      "shop/urls.py#route@/about",
    ])
  })

  it("puts a function view under the methods its decorators allow, under ANY when none says, and a view class with no method of HTTP under ANY itself", () => {
    const headings = listTraceNodes(diagram.traceNodes).flatMap((node) => node.codeBlocks.slice(0, 1).flatMap((block) => (block.card?.part === "handler" ? [`${block.name ?? ""} ${block.card.heading ?? ""}`] : [])))

    expect(headings).toStrictEqual(["TeamList ANY", "user_list ANY", "user_create POST", "user_detail GET · POST", "AboutView.get GET", "AboutView.post POST"])
  })
})

describe("the include of Django", () => {
  it("puts the path of an include before the paths of the module it names, written as text, in a pair with a namespace or imported whole, across files and through every include above it", () => {
    const root = codeOf(
      "from django.urls import include, path",
      "from shop import admin_urls",
      "urlpatterns = [",
      "    path(\"api/\", include(\"shop.api_urls\")),",
      "    path(\"admin/\", include(admin_urls)),",
      "    path(\"blog/\", include([path(\"posts/\", posts)])),",
      "]",
      "def posts(request):",
      "    return list_posts()",
    )
    const api = codeOf("from django.urls import include, path", "urlpatterns = [", "    path(\"v1/\", include((\"shop.v1_urls\", \"v1\"))),", "]")
    const v1 = codeOf("from django.urls import path", "def items(request):", "    return list_items()", "urlpatterns = [path(\"items/\", items)]")
    const admin = codeOf("from django.urls import path", "def stats(request):", "    return read_stats()", "urlpatterns = [path(\"stats/\", stats)]")
    const diagram = presentDiagramOf(
      { "mysite/urls.py": root, "shop/api_urls.py": api, "shop/v1_urls.py": v1, "shop/admin_urls.py": admin },
      { "mysite/urls.py": [rangeAt(9, 5, 9, 23)], "shop/v1_urls.py": [rangeAt(3, 5, 3, 23)], "shop/admin_urls.py": [rangeAt(3, 5, 3, 23)] },
    )

    expect(diagram.traceNodes.map((node) => node.id)).toStrictEqual(["mysite/urls.py#route@/blog/posts", "shop/v1_urls.py#route@/api/v1/items", "shop/admin_urls.py#route@/admin/stats"])
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

    expect(listTraceNodes(diagram.traceNodes).map((node) => node.id)).toStrictEqual(["server/plugin.ts#route@/v1/users", "server/plugin.ts#effect-callback@3:25"])
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
    const edgeIds = diagram.traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("server/hooks.ts#function@1:1 -> server/app.ts#effect-callback@6:49")
    expect(edgeIds).toContain("server/hooks.ts#function@4:1 -> server/app.ts#route@/v1/users")
  })
})

const NEST_FILES = {
  "src/users/users.controller.ts": codeOf(
    "import { Controller, Get, Post, UseGuards, UseInterceptors } from \"@nestjs/common\"",
    "import { UsersService } from \"./users.service\"",
    "import { AuthGuard } from \"../auth.guard\"",
    "import { LoggingInterceptor } from \"../logging.interceptor\"",
    "@UseGuards(AuthGuard)",
    "@Controller(\"users\")",
    "export class UsersController {",
    "  constructor(private readonly usersService: UsersService) {}",
    "  @UseInterceptors(LoggingInterceptor)",
    "  @Get()",
    "  findAll() {",
    "    return this.usersService.findAll()",
    "  }",
    "  @Post()",
    "  create() {",
    "    return this.usersService.create()",
    "  }",
    "  @Get(\":id\")",
    "  findOne() {",
    "    return this.usersService.findAll()",
    "  }",
    "}",
  ),
  "src/users/users.service.ts": codeOf(
    "export class UsersService {",
    "  findAll() {",
    "    return db.user.findMany()",
    "  }",
    "  create() {",
    "    return db.user.create()",
    "  }",
    "}",
  ),
  "src/auth.guard.ts": codeOf("export class AuthGuard {", "  canActivate(context) {", "    return check(context)", "  }", "}"),
  "src/logging.interceptor.ts": codeOf("export class LoggingInterceptor {", "  intercept(context, next) {", "    return next.handle()", "  }", "}"),
}

const NEST_CHANGES = {
  "src/users/users.service.ts": [rangeAt(3, 5, 3, 30), rangeAt(6, 5, 6, 28)],
  "src/auth.guard.ts": [rangeAt(3, 5, 3, 26)],
  "src/logging.interceptor.ts": [rangeAt(3, 5, 3, 25)],
}

describe("the card of a route path of a Nest controller", () => {
  it("makes a route node of each path its methods register, with the methods inside it, and a node of the controller beside them with a line to each", () => {
    const diagram = presentDiagramOf(NEST_FILES, NEST_CHANGES)

    expect(outlineOfNodes(diagram).filter((line) => !line.includes("Service") && !line.includes("Guard") && !line.includes("Interceptor"))).toStrictEqual([
      "class UsersController",
      "route UsersController.findAll",
      "  method UsersController.findAll",
      "  method UsersController.create",
      "route UsersController.findOne",
      "  method UsersController.findOne",
    ])
    expect(listTraceNodes(diagram.traceNodes).filter((node) => node.type === "route").map((node) => node.id)).toStrictEqual([
      "src/users/users.controller.ts#route@/users",
      "src/users/users.controller.ts#route@/users/:id",
    ])
    expect(diagram.traceNodeEdges.filter((edge) => edge.from === "src/users/users.controller.ts#class@5:1").map((edge) => edge.to)).toStrictEqual([
      "src/users/users.controller.ts#route@/users",
      "src/users/users.controller.ts#route@/users/:id",
    ])
  })

  it("draws a line from a handler to the method of the service it calls through what the constructor injects", () => {
    const edgeIds = presentDiagramOf(NEST_FILES, NEST_CHANGES).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("src/users/users.controller.ts#method@9:3 -> src/users/users.service.ts#method@2:3")
    expect(edgeIds).toContain("src/users/users.controller.ts#method@14:3 -> src/users/users.service.ts#method@5:3")
  })

  it("draws a line from a guard of the controller to each of its route nodes, and from an interceptor of a method to that method only", () => {
    const edgeIds = presentDiagramOf(NEST_FILES, NEST_CHANGES).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toStrictEqual(expect.arrayContaining([
      "src/auth.guard.ts#class@1:1 -> src/users/users.controller.ts#route@/users",
      "src/auth.guard.ts#class@1:1 -> src/users/users.controller.ts#route@/users/:id",
      "src/logging.interceptor.ts#class@1:1 -> src/users/users.controller.ts#method@9:3",
    ]))
    expect(edgeIds).not.toContain("src/users/users.controller.ts#method@9:3 -> src/logging.interceptor.ts#class@1:1")
  })

  it("keeps a method that is no route in the card of its controller, and the line from the controller to the routes of its other methods", () => {
    const files = { ...NEST_FILES, "src/users/users.controller.ts": NEST_FILES["src/users/users.controller.ts"].replace("  @Get(\":id\")\n", "") }
    const diagram = presentDiagramOf(files, NEST_CHANGES)
    const controller = listTraceNodes(diagram.traceNodes).find((node) => node.id === "src/users/users.controller.ts#class@5:1")

    expect(controller?.children.map((child) => child.codeBlocks[0].name)).toStrictEqual(["UsersController.findOne"])
    const targetIds = diagram.traceNodeEdges.filter((edge) => edge.from === controller?.id).map((edge) => edge.to)

    expect(targetIds.filter((targetId) => targetId.includes("#route@") || targetId === "src/users/users.controller.ts#method@9:3")).toStrictEqual(["src/users/users.controller.ts#route@/users"])
  })
})

describe("the card of a Nest GraphQL resolver", () => {
  it("makes the resolver a router node holding its decorated methods, and a method that is no field among them", () => {
    const resolver = codeOf(
      "import { Mutation, Query, Resolver } from \"@nestjs/graphql\"",
      "@Resolver()",
      "export class UsersResolver {",
      "  @Query(() => [User])",
      "  users() {",
      "    return this.find()",
      "  }",
      "  @Mutation(() => User)",
      "  addUser() {",
      "    return save()",
      "  }",
      "  find() {",
      "    return load()",
      "  }",
      "}",
    )
    const diagram = presentDiagramOf({ "src/users.resolver.ts": resolver }, { "src/users.resolver.ts": [rangeAt(10, 5, 10, 18), rangeAt(13, 5, 13, 18)] })

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "class UsersResolver (changed)",
      "  method UsersResolver.users",
      "  method UsersResolver.addUser (changed)",
      "  method UsersResolver.find (changed)",
    ])
  })
})
