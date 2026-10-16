import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const TRPC = codeOf(
  "import { initTRPC } from \"@trpc/server\"",
  "const t = initTRPC.create()",
  "export const createTRPCRouter = t.router",
  "export const publicProcedure = t.procedure",
  "export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {",
  "  if (!ctx.session) throw new Error(\"no session\")",
  "  return next()",
  "})",
)

const TODO = codeOf(
  "import { createTRPCRouter, publicProcedure, protectedProcedure } from \"./trpc\"",
  "export const todoRouter = createTRPCRouter({",
  "  list: publicProcedure.query(({ ctx }) => ctx.db.query.todos.findMany()),",
  "  update: protectedProcedure.input(schema).mutation(async ({ ctx, input }) => {",
  "    if (!input.title) throw new Error(\"no title\")",
  "    await ctx.db.update(input)",
  "  }),",
  "  onAdd: publicProcedure.subscription(async function* () {",
  "    yield* added()",
  "  }),",
  "})",
)

const ROOT = codeOf("import { todoRouter } from \"./todo\"", "import { createTRPCRouter } from \"./trpc\"", "export const appRouter = createTRPCRouter({ todo: todoRouter })")

const FILES = { "server/trpc.ts": TRPC, "server/todo.ts": TODO, "server/root.ts": ROOT }

describe("the card of a tRPC router", () => {
  it("draws each procedure inside the card of its router, named after its key", () => {
    const diagram = presentDiagramOf(FILES, { "server/todo.ts": [rangeAt(3, 44, 3, 72), rangeAt(6, 5, 6, 31), rangeAt(9, 5, 9, 19)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["root-variable todoRouter", "  resolver  (changed)", "  resolver  (changed)", "  resolver  (changed)"])
  })

  it("draws a line from the procedure a procedure is built on to it, and none back", () => {
    const diagram = presentDiagramOf(FILES, { "server/trpc.ts": [rangeAt(6, 3, 6, 50)], "server/todo.ts": [rangeAt(6, 5, 6, 31)] })
    const edgeIds = diagram.journeyNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("server/trpc.ts#root-variable@5:1 -> server/todo.ts#resolver@4:11")
    expect(edgeIds).not.toContain("server/todo.ts#resolver@4:11 -> server/trpc.ts#root-variable@5:1")
  })

  it("gives a router that only joins other routers no node", () => {
    const diagram = presentDiagramOf(FILES, { "server/root.ts": [rangeAt(3, 1, 3, 66)], "server/todo.ts": [rangeAt(6, 5, 6, 31)] })

    expect(outlineOfNodes(diagram).filter((line) => !line.startsWith(" "))).toStrictEqual(["root-variable todoRouter"])
  })
})
