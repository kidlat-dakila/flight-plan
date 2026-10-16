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
