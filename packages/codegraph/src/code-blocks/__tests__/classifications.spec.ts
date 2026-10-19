import { classificationsAt, readOwnClassifications, sortClassifications } from "@/code-blocks/classifications"
import { LIBRARIES } from "@/code-blocks/libraries"
import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { CodeBlockClassification } from "@/code-blocks/types"
import { CODE_BLOCK_CLASSIFICATIONS, primaryClassificationOf } from "@flightplan/configurations"
import { blockNamed, codeOf, groupOf, rangeAt } from "./group-fixture"

interface Classified {
  readonly classifications: readonly CodeBlockClassification[]
  readonly diffClassifications: readonly CodeBlockClassification[]
}

const classifiedOf = ({ classifications, diffClassifications }: StoredCodeBlock): Classified => ({ classifications, diffClassifications })

const blockOfType = (group: StoredCodeGroupGraph, type: StoredCodeBlock["type"]): StoredCodeBlock => {
  const block = group.codeBlocks.find((candidate) => candidate.type === type)
  if (block === undefined) throw new Error(`There is no ${type} block.`)
  return block
}

const PRISMA_IMPORT = "import { PrismaClient } from \"@prisma/client\""

const ORDER_FORM = codeOf(
  PRISMA_IMPORT,
  "const prisma = new PrismaClient()",
  "export const OrderForm = ({ order }) => {",
  "  const save = async () => {",
  "    await prisma.order.create({ data: order })",
  "  }",
  "  return <button onClick={save}>Save</button>",
  "}",
)

describe("the classifications of a code block", () => {
  it("keeps the hierarchy in one ordered list, from test down to logic", () => {
    expect(CODE_BLOCK_CLASSIFICATIONS[0]).toBe("test")
    expect(CODE_BLOCK_CLASSIFICATIONS[CODE_BLOCK_CLASSIFICATIONS.length - 1]).toBe("logic")
    expect(sortClassifications(["logic", "state", "store", "component", "page"])).toStrictEqual(["page", "component", "store", "state", "logic"])
  })

  it("puts every narrower classification right above the one it narrows", () => {
    const rankOf = (classification: CodeBlockClassification): number => CODE_BLOCK_CLASSIFICATIONS.indexOf(classification)
    const narrowing: readonly (readonly [CodeBlockClassification, CodeBlockClassification])[] = [
      ["page", "component"],
      ["webhook", "api-route"],
      ["server-action", "api-route"],
      ["queue-consumer", "job"],
      ["third-party-integration", "request"],
      ["form", "validation"],
      ["store", "state"],
    ]

    expect(narrowing.every(([narrower, wider]) => rankOf(narrower) < rankOf(wider))).toBe(true)
  })

  it("gives a component its own classification and those of every block inside it, in the order of the hierarchy", () => {
    const group = groupOf({ "src/order-form.tsx": ORDER_FORM })

    expect(classifiedOf(blockNamed(group, "component", "OrderForm"))).toStrictEqual({ classifications: ["component", "database-operation"], diffClassifications: [] })
    expect(classifiedOf(blockOfType(group, "data"))).toStrictEqual({ classifications: ["database-operation"], diffClassifications: [] })
  })

  it("says what the change does apart from what the block is", () => {
    const group = groupOf({ "src/order-form.tsx": ORDER_FORM }, { "src/order-form.tsx": [rangeAt(5, 25, 5, 31)] })

    expect(classifiedOf(blockNamed(group, "component", "OrderForm"))).toStrictEqual({
      classifications: ["component", "database-operation"],
      diffClassifications: ["database-operation"],
    })
    expect(primaryClassificationOf(blockNamed(group, "component", "OrderForm").diffClassifications)).toBe("database-operation")
  })

  it("keeps the change a subset of what the block is, and leaves it empty for a block nothing changed in", () => {
    const group = groupOf({ "src/order-form.tsx": ORDER_FORM }, { "src/order-form.tsx": [rangeAt(7, 28, 7, 32)] })

    expect(group.codeBlocks.every((block) => block.diffClassifications.every((classification) => block.classifications.includes(classification)))).toBe(true)
    expect(blockOfType(group, "data").diffClassifications).toStrictEqual([])
  })

  it("gives logic to a block that earns nothing else, and to a change in it", () => {
    const group = groupOf({ "src/total.ts": codeOf("export const totalOf = (lines) => lines.reduce((sum, line) => sum + line.price, 0)") }, { "src/total.ts": [rangeAt(1, 60, 1, 64)] })

    expect(classifiedOf(blockNamed(group, "function", "totalOf"))).toStrictEqual({ classifications: ["logic"], diffClassifications: ["logic"] })
  })

  it("leaves out a block that is only affected, since that is the call chain", () => {
    const files = {
      "src/total.ts": codeOf("export const totalOf = (lines) => lines.length"),
      "src/cart.tsx": codeOf("import { totalOf } from \"./total\"", "export const Cart = ({ lines }) => <p>{totalOf(lines)}</p>"),
    }
    const group = groupOf(files, { "src/total.ts": [rangeAt(1, 41, 1, 47)] })
    const affected = group.codeBlocks.filter((block) => block.diffs.some((diff) => diff.type === "affected"))

    expect(affected.map((block) => block.id)).toStrictEqual(["src/cart.tsx#render@2:36"])
    expect(affected.map((block) => block.diffClassifications)).toStrictEqual([[]])
  })

  it("does not count what a block calls", () => {
    const files = {
      "src/orders.ts": codeOf(PRISMA_IMPORT, "const prisma = new PrismaClient()", "export const saveOrder = (order) => prisma.order.create({ data: order })"),
      "src/submit.ts": codeOf("import { saveOrder } from \"./orders\"", "export const submit = (order) => saveOrder(order)"),
    }

    expect(blockNamed(groupOf(files), "function", "submit").classifications).toStrictEqual(["logic"])
  })

  it("classifies a read of a database as a database operation and a read over the network as a request", () => {
    const files = {
      "src/orders.ts": codeOf(PRISMA_IMPORT, "const prisma = new PrismaClient()", "export const listOrders = () => prisma.order.findMany()"),
      "src/remote.ts": codeOf("export const listRemote = () => fetch(\"/api/orders\")"),
    }
    const group = groupOf(files)

    expect(blockNamed(group, "function", "listOrders").classifications).toStrictEqual(["database-operation"])
    expect(blockNamed(group, "function", "listRemote").classifications).toStrictEqual(["request"])
  })

  it("classifies a removed block by the type it had", () => {
    const group = groupOf({ "src/orders.ts": codeOf(PRISMA_IMPORT, "const prisma = new PrismaClient()", "export const save = (order) => prisma.order.create({ data: order })") })
    const removed: StoredCodeBlock = { ...blockOfType(group, "data"), id: "src/orders.ts#deleted@3:32", type: "deleted", deletedType: "data" }

    expect(readOwnClassifications(removed, [], { placedByPath: new Map(), libraries: LIBRARIES })).toStrictEqual(["database-operation"])
  })

  it("earns the classification of a library call that makes no block type of its own", () => {
    const mailer = codeOf(
      "import nodemailer from \"nodemailer\"",
      "const transporter = nodemailer.createTransport({ host: \"smtp.example.com\" })",
      "export const sendReceipt = async (user) => {",
      "  const sent = await transporter.sendMail({ to: user.email })",
      "  return sent",
      "}",
    )

    expect(blockNamed(groupOf({ "src/mail.ts": mailer }), "function", "sendReceipt").classifications).toStrictEqual(["third-party-integration", "request"])
  })

  it("classifies a store by its card and a procedure as a server action", () => {
    const files = {
      "package.json": JSON.stringify({ dependencies: { "zustand": "5.0.0", "@trpc/server": "11.0.0" } }),
      "src/cart-store.ts": codeOf("import { create } from \"zustand\"", "export const useCartStore = create((set) => ({ lines: [], clear: () => set({ lines: [] }) }))"),
      "src/router.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const appRouter = t.router({ list: t.procedure.query(() => []) })"),
    }
    const group = groupOf(files)

    expect(blockNamed(group, "state", "useCartStore").classifications).toContain("store")
    expect(blockNamed(group, "root-variable", "appRouter").classifications).toContain("server-action")
  })

  it("classifies a route handler written in another file than its route as an api-route, through its card", () => {
    const files = {
      "requirements.txt": "django",
      "shop/urls.py": codeOf("from django.urls import path", "from shop.views import users", "", "urlpatterns = [path(\"users/\", users)]"),
      "shop/views.py": codeOf("def users(request):", "    return None"),
    }

    expect(blockNamed(groupOf(files), "function", "users").classifications).toStrictEqual(["api-route"])
  })

  it("classifies the callback a queue worker runs as a queue consumer, and one a scheduler runs as a job", () => {
    const files = {
      "src/worker.ts": codeOf("import { Worker } from \"bullmq\"", "export const worker = new Worker(\"receipts\", async (job) => sendReceipt(job.data))"),
      "src/schedule.ts": codeOf("import { Agenda } from \"agenda\"", "const agenda = new Agenda()", "agenda.define(\"send email\", async (job) => sendEmail(job.attrs.data))"),
    }
    const group = groupOf(files)

    expect(blockNamed(group, "root-variable", "worker").classifications).toContain("queue-consumer")
    expect(group.codeBlocks.filter((block) => block.filePath === "src/schedule.ts").flatMap((block) => block.classifications)).toContain("job")
  })
})

describe("the classifications a file location gives", () => {
  it("classifies a file by the names a tool gives, without reading it", () => {
    expect(["Dockerfile", ".github/workflows/ci.yml", "infra/main.tf", "apps/web/vite.config.ts", "packages/ui/package.json"].map((filePath) => classificationsAt(filePath))).toStrictEqual([
      ["build-and-infrastructure"],
      ["build-and-infrastructure"],
      ["build-and-infrastructure"],
      ["build-and-infrastructure"],
      ["build-and-infrastructure"],
    ])
    expect(["prisma/schema.prisma", ".env.local", "locale/fr.po", "src/theme.css", "src/orders.ts"].map((filePath) => classificationsAt(filePath))).toStrictEqual([
      ["data-model"],
      ["config"],
      ["i18n"],
      ["styling"],
      [],
    ])
  })

  it("gives an unread file file only when no location names it", () => {
    const group = groupOf({ "schema.sql": "create table orders;", "src/theme.css": "body { color: red; }" })

    expect(group.codeBlocks.map((block) => [block.filePath, block.classifications])).toStrictEqual([
      ["schema.sql", ["file"]],
      ["src/theme.css", ["styling"]],
    ])
  })

  it("adds the classification a location gives to every block of a file a language reads", () => {
    const group = groupOf({ "vite.config.ts": codeOf("export default defineConfig({ plugins: [] })") })

    expect(group.codeBlocks.every((block) => block.classifications.includes("build-and-infrastructure"))).toBe(true)
  })
})
