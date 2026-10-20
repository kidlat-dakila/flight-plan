import { CLASSIFICATION_BY_CATEGORY, classificationOfType, classificationsAt, readOwnClassifications, sortClassifications } from "@/code-blocks/classifications"
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
    expect(sortClassifications(["logic", "ui-state", "security", "component", "page"])).toStrictEqual(["page", "component", "ui-state", "security", "logic"])
  })

  it("puts every narrower classification right above the one it narrows", () => {
    const rankOf = (classification: CodeBlockClassification): number => CODE_BLOCK_CLASSIFICATIONS.indexOf(classification)
    const narrowing: readonly (readonly [CodeBlockClassification, CodeBlockClassification])[] = [
      ["page", "component"],
      ["webhook", "api-route"],
      ["server-action", "api-route"],
      ["messaging", "job"],
      ["third-party-integration", "api-request"],
    ]

    expect(narrowing.every(([narrower, wider]) => rankOf(narrower) < rankOf(wider))).toBe(true)
  })

  it("gives a component its own classification and those of every block inside it, in the order of the hierarchy", () => {
    const group = groupOf({ "src/order-form.tsx": ORDER_FORM })

    expect(classifiedOf(blockNamed(group, "component", "OrderForm"))).toStrictEqual({ classifications: ["component", "database-read-write"], diffClassifications: [] })
    expect(classifiedOf(blockOfType(group, "data"))).toStrictEqual({ classifications: ["database-read-write"], diffClassifications: [] })
  })

  it("says what the change does apart from what the block is", () => {
    const group = groupOf({ "src/order-form.tsx": ORDER_FORM }, { "src/order-form.tsx": [rangeAt(5, 25, 5, 31)] })

    expect(classifiedOf(blockNamed(group, "component", "OrderForm"))).toStrictEqual({
      classifications: ["component", "database-read-write"],
      diffClassifications: ["database-read-write"],
    })
    expect(primaryClassificationOf(blockNamed(group, "component", "OrderForm").diffClassifications)).toBe("database-read-write")
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

  it("classifies a read of a database as a database read or write and a read over the network as an API request", () => {
    const files = {
      "src/orders.ts": codeOf(PRISMA_IMPORT, "const prisma = new PrismaClient()", "export const listOrders = () => prisma.order.findMany()"),
      "src/remote.ts": codeOf("export const listRemote = () => fetch(\"/api/orders\")"),
    }
    const group = groupOf(files)

    expect(blockNamed(group, "function", "listOrders").classifications).toStrictEqual(["database-read-write"])
    expect(blockNamed(group, "function", "listRemote").classifications).toStrictEqual(["api-request"])
  })

  it("merges state and stores into UI state, auth into security, events and queues into messaging, and types into schemas", () => {
    const types: readonly StoredCodeBlock["type"][] = ["state", "derived", "auth", "publish", "type-declaration", "request", "data"]

    expect(types.map(classificationOfType)).toStrictEqual(["ui-state", "ui-state", "security", "messaging", "data-model", "api-request", "database-read-write"])
  })

  it("gives UI state to a form library, a WebSocket to a realtime library and app setup to dependency injection", () => {
    expect(["forms", "realtime", "dependency-injection"].map((category) => CLASSIFICATION_BY_CATEGORY.get(category))).toStrictEqual(["ui-state", "websocket", "app-setup"])
  })

  it("classifies a removed block by the type it had", () => {
    const group = groupOf({ "src/orders.ts": codeOf(PRISMA_IMPORT, "const prisma = new PrismaClient()", "export const save = (order) => prisma.order.create({ data: order })") })
    const removed: StoredCodeBlock = { ...blockOfType(group, "data"), id: "src/orders.ts#deleted@3:32", type: "deleted", deletedType: "data" }

    expect(readOwnClassifications(removed, [], { placedByPath: new Map(), libraries: LIBRARIES })).toStrictEqual(["database-read-write"])
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

    expect(blockNamed(groupOf({ "src/mail.ts": mailer }), "function", "sendReceipt").classifications).toStrictEqual(["third-party-integration", "api-request"])
  })

  it("classifies a store by its card and a procedure as a server action", () => {
    const files = {
      "package.json": JSON.stringify({ dependencies: { "zustand": "5.0.0", "@trpc/server": "11.0.0" } }),
      "src/cart-store.ts": codeOf("import { create } from \"zustand\"", "export const useCartStore = create((set) => ({ lines: [], clear: () => set({ lines: [] }) }))"),
      "src/router.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const appRouter = t.router({ list: t.procedure.query(() => []) })"),
    }
    const group = groupOf(files)

    expect(blockNamed(group, "state", "useCartStore").classifications).toContain("ui-state")
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

    expect(blockNamed(group, "root-variable", "worker").classifications).toContain("messaging")
    expect(group.codeBlocks.filter((block) => block.filePath === "src/schedule.ts").flatMap((block) => block.classifications)).toContain("job")
  })

  it("classifies a Python function that writes through a parameter typed as a database session as a database read or write", () => {
    const files = {
      "requirements.txt": "sqlalchemy",
      "shop/service.py": codeOf(
        "from sqlalchemy.orm import Session",
        "",
        "def create_order(quantity: int, session: Session) -> None:",
        "    session.add(quantity)",
        "    session.commit()",
      ),
    }

    expect(blockNamed(groupOf(files), "function", "create_order").classifications).toStrictEqual(["database-read-write"])
  })

  it("classifies a TypeScript function that writes through a parameter typed as a database client as a database read or write, at any position", () => {
    const files = {
      "src/orders.ts": codeOf(
        "import { PrismaClient } from \"@prisma/client\"",
        "export const createOrder = async (quantity: number, prisma: PrismaClient) => {",
        "  await prisma.order.create({ data: { quantity } })",
        "}",
      ),
    }

    expect(blockNamed(groupOf(files), "function", "createOrder").classifications).toContain("database-read-write")
  })

  it("follows a parameter typed with an Annotated alias of a session, from another file and written in place", () => {
    const files = {
      "requirements.txt": "fastapi\nsqlalchemy",
      "shop/__init__.py": "",
      "shop/database.py": codeOf(
        "from typing import Annotated",
        "from fastapi import Depends",
        "from sqlalchemy.orm import Session",
        "",
        "def get_session():",
        "    return None",
        "",
        "SessionDep = Annotated[Session, Depends(get_session)]",
      ),
      "shop/service.py": codeOf(
        "from typing import Annotated",
        "from fastapi import Depends",
        "from sqlalchemy.orm import Session",
        "from shop.database import SessionDep, get_session",
        "",
        "def create_order(quantity: int, session: SessionDep) -> None:",
        "    session.add(quantity)",
        "",
        "def delete_order(order_id: int, session: Annotated[Session, Depends(get_session)]) -> None:",
        "    session.delete(order_id)",
      ),
    }
    const group = groupOf(files)

    expect(["create_order", "delete_order"].map((name) => primaryClassificationOf(blockNamed(group, "function", name).classifications))).toStrictEqual(["database-read-write", "database-read-write"])
  })

  it("classifies a function that reads through a SQLModel session as a database read or write, and a SQLModel table as a data model", () => {
    const files = {
      "requirements.txt": "sqlmodel",
      "shop/heroes.py": codeOf(
        "from sqlmodel import Field, Session, SQLModel, select",
        "",
        "class Hero(SQLModel, table=True):",
        "    id: int | None = Field(default=None, primary_key=True)",
        "",
        "def list_heroes(session: Session) -> list[Hero]:",
        "    return session.exec(select(Hero)).all()",
      ),
    }
    const group = groupOf(files)

    expect([blockNamed(group, "class", "Hero").classifications, blockNamed(group, "function", "list_heroes").classifications]).toStrictEqual([["data-model"], ["database-read-write"]])
  })

  it("classifies a method that writes through a member typed as a repository or an entity manager as a database read or write", () => {
    const files = {
      "src/users.service.ts": codeOf(
        "import { EntityManager, Repository } from \"typeorm\"",
        "import { EntityManager as MikroEntityManager } from \"@mikro-orm/postgresql\"",
        "export class UsersService {",
        "  private readonly audit: EntityManager",
        "  constructor(private readonly users: Repository<User>, private readonly em: MikroEntityManager) {}",
        "  findUser(id: number) {",
        "    return this.users.findOneBy({ id })",
        "  }",
        "  logVisit(visit: Visit) {",
        "    return this.audit.save(visit)",
        "  }",
        "  async renameUser(user: User) {",
        "    await this.em.flush()",
        "  }",
        "}",
        "export const removeUser = (manager: EntityManager, user: User) => manager.remove(user)",
      ),
    }
    const group = groupOf(files)

    expect(["UsersService.findUser", "UsersService.logVisit", "UsersService.renameUser"].map((name) => blockNamed(group, "method", name).classifications)).toStrictEqual([
      ["database-read-write"],
      ["database-read-write"],
      ["database-read-write"],
    ])
    expect(blockNamed(group, "function", "removeUser").classifications).toContain("database-read-write")
  })

  it("classifies a Python method that writes through a member it was handed a session for as a database read or write", () => {
    const files = {
      "requirements.txt": "sqlalchemy",
      "shop/orders.py": codeOf(
        "from sqlalchemy.orm import Session",
        "",
        "class OrderStore:",
        "    def __init__(self, session: Session) -> None:",
        "        self.session = session",
        "",
        "    def save(self, order) -> None:",
        "        self.session.add(order)",
      ),
    }

    expect(blockNamed(groupOf(files), "method", "OrderStore.save").classifications).toStrictEqual(["database-read-write"])
  })

  it("keeps the hierarchy for a route that writes through its session, an api route first", () => {
    const files = {
      "requirements.txt": "fastapi\nsqlalchemy",
      "shop/routes.py": codeOf(
        "from fastapi import APIRouter",
        "from sqlalchemy.orm import Session",
        "",
        "router = APIRouter()",
        "",
        "@router.delete(\"/orders/{order_id}\")",
        "def delete_order(order_id: int, session: Session) -> None:",
        "    session.delete(order_id)",
      ),
    }
    const classifications = blockNamed(groupOf(files), "function", "delete_order").classifications

    expect([primaryClassificationOf(classifications), classifications.includes("database-read-write")]).toStrictEqual(["api-route", true])
  })

  it("classifies a Pydantic model as a data model, and a validator written in it as a validation", () => {
    const files = {
      "requirements.txt": "pydantic",
      "shop/schemas.py": codeOf(
        "from pydantic import BaseModel, field_validator",
        "",
        "class OrderCreate(BaseModel):",
        "    quantity: int",
        "",
        "    @field_validator(\"quantity\")",
        "    @classmethod",
        "    def check_quantity(cls, value: int) -> int:",
        "        return value",
      ),
    }
    const group = groupOf(files)

    expect(primaryClassificationOf(blockNamed(group, "class", "OrderCreate").classifications)).toBe("data-model")
    expect(blockNamed(group, "class", "OrderCreate").classifications).toContain("validation")
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
