import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { blockNamed, codeOf, groupOf, outlineOf, rangeAt, spanOf, type FixtureDiffs, type FixtureFiles } from "./group-fixture"

const outlineOfCode = (filePath: string, ...lines: readonly string[]): string[] => outlineOf(groupOf({ [filePath]: codeOf(...lines) }), filePath)

const diffsOf = (group: StoredCodeGroupGraph): string[] =>
  group.codeBlocks.flatMap((block) => block.diffs.map((diff) => [block.type, block.name ?? "-", diff.type, spanOf(diff.range)].join(" ")))

const diffsIn = (files: FixtureFiles, diffs: FixtureDiffs): string[] => diffsOf(groupOf(files, diffs))

const STORE = codeOf(
  "import { create } from \"zustand\"",
  "export const useCartStore = create((set) => ({",
  "  items: [],",
  "  promo: null,",
  "  clear: () => {",
  "    set({ items: [] })",
  "  },",
  "}))",
)
const SUMMARY = codeOf(
  "import { useCartStore } from \"./cart-store\"",
  "export const Summary = () => {",
  "  const promo = useCartStore((state) => state.promo)",
  "  const items = useCartStore((state) => state.items)",
  "  return <p>{promo}{items.length}</p>",
  "}",
)

describe("the variable blocks of a file", () => {
  it("makes a variable of each local declaration, of a name a loop or a catch binds, and of each argument of a function below the root", () => {
    expect(outlineOfCode(
      "src/run.ts",
      "export function run(items) {",
      "  const [first, second] = items",
      "  for (const item of items) { use(item) }",
      "  try { go() } catch (error) { use(error) }",
      "  let later",
      "  function inner(x, { y }, ...rest) { return x }",
      "  return items.map(function (entry, index) { return entry })",
      "}",
    )).toStrictEqual([
      "function run 1:1-8:2",
      "  root-argument-value items 1:21-1:26",
      "    root-argument-value map 7:10-7:19",
      "  variable first 2:3-2:32",
      "  loop 3:3-3:42",
      "    variable item 3:14-3:18",
      "    call use 3:31-3:40",
      "  try-catch 4:3-4:44",
      "    call go 4:9-4:13",
      "    variable error 4:23-4:28",
      "    call use 4:32-4:42",
      "  variable later 5:3-5:12",
      "  function inner 6:3-6:49",
      "    variable x 6:18-6:19",
      "    variable y 6:21-6:26",
      "    variable rest 6:28-6:35",
      "  function 7:20-7:60",
      "    variable entry 7:30-7:35",
      "    variable index 7:37-7:42",
    ])
  })

  it("makes no variable of a declaration at the root of a file, of one that keeps a block, or of one that only says a name exists", () => {
    expect(outlineOfCode("src/run.ts", "const LIMIT = 3", "declare const VERSION: string", "export function run() {", "  const send = () => 1", "}")).toStrictEqual([
      "root-variable LIMIT 1:1-1:16",
      "type-declaration 2:1-2:30",
      "function run 3:1-5:2",
      "  function send 4:3-4:23",
    ])
  })

  it("makes a variable of a local name, of a name a loop binds and of each argument of a function below the root in Python", () => {
    expect(outlineOfCode(
      "shop/run.py",
      "def run(items):",
      "    count = 2",
      "    for item in items:",
      "        use(item)",
      "    def inner(x, y=1):",
      "        return x",
      "    return map(lambda entry: entry, items)",
    )).toStrictEqual([
      "function run 1:1-7:43",
      "  root-argument-value items 1:9-1:14",
      "  variable count 2:5-2:14",
      "  loop 3:5-4:18",
      "    variable item 3:9-3:13",
      "    call use 4:9-4:18",
      "  function inner 5:5-6:17",
      "    variable x 5:15-5:16",
      "    variable y 5:18-5:21",
      "  function 7:16-7:35",
      "    variable entry 7:23-7:28",
    ])
  })

  it("places a change of a local declaration in its variable, and still counts it as a change of the block around it for the chains", () => {
    const file = codeOf("export function run() {", "  const label = \"Apply\"", "  return label", "}")
    const group = groupOf({ "src/run.ts": file }, { "src/run.ts": [rangeAt(2, 17, 2, 24)] })
    const run = blockNamed(group, "function", "run")

    expect(group.diffBlockIds).toStrictEqual(["src/run.ts#variable@2:3"])
    expect([group.diffChainIds, run.diffSourceIds]).toStrictEqual([[run.id], [run.id]])
  })

  it("marks the block that reads a changed local variable, and the block that reads a changed argument", () => {
    const file = codeOf(
      "export function run() {",
      "  const label = \"Apply\"",
      "  const send = (code) => {",
      "    if (code) { log(label) }",
      "  }",
      "}",
    )

    expect(diffsIn({ "src/run.ts": file }, { "src/run.ts": [rangeAt(2, 17, 2, 24)] })).toStrictEqual(["variable label modified 2:17-2:24", "call log affected 4:21-4:26"])
    expect(diffsIn({ "src/run.ts": file }, { "src/run.ts": [rangeAt(3, 17, 3, 21)] })).toStrictEqual(["variable code modified 3:17-3:21", "condition - affected 4:9-4:13"])
  })
})

describe("the property blocks of a file", () => {
  it("makes a property of each key of an object whose value is no function, at any depth, and of a field of a class that is no function", () => {
    expect(outlineOfCode(
      "src/api.ts",
      "export const api = {",
      "  retries: 3,",
      "  users: { limit: 10, remove() {} },",
      "  load: () => 1,",
      "  shared,",
      "}",
      "export class Order {",
      "  count = 2",
      "  total = () => 1",
      "}",
    )).toStrictEqual([
      "root-variable api 1:1-6:2",
      "  property retries 2:3-2:13",
      "  property users 3:3-3:36",
      "    property limit 3:12-3:21",
      "    function remove 3:23-3:34",
      "  function load 4:3-4:16",
      "  property shared 5:3-5:9",
      "class Order 7:1-10:2",
      "  property Order.count 8:3-8:12",
      "  method Order.total 9:3-9:18",
    ])
  })

  it("makes a property of an attribute of a Python class, and of an attribute a method sets on the receiver, once, where it is first set", () => {
    expect(outlineOfCode(
      "shop/order.py",
      "class Order:",
      "    limit = 3",
      "    def __init__(self):",
      "        self.count = 0",
      "        self.limit = 5",
      "    def add(self):",
      "        self.count = self.count + 1",
    )).toStrictEqual([
      "class Order 1:1-7:36",
      "  property Order.limit 2:5-2:14",
      "  method Order.__init__ 3:5-5:23",
      "    property Order.count 4:9-4:23",
      "  method Order.add 6:5-7:36",
    ])
  })

  it("marks the method that reads a changed attribute of its Python class, set on the class or on the receiver", () => {
    const file = codeOf(
      "class Order:",
      "    limit = 3",
      "    def __init__(self):",
      "        self.count = 0",
      "    def total(self):",
      "        return self.count",
      "    def most(self):",
      "        return self.limit",
    )

    expect(diffsIn({ "shop/order.py": file }, { "shop/order.py": [rangeAt(4, 22, 4, 23)] }).filter((line) => line.includes("affected"))).toStrictEqual(["method Order.total affected 6:16-6:26"])
    expect(diffsIn({ "shop/order.py": file }, { "shop/order.py": [rangeAt(2, 13, 2, 14)] }).filter((line) => line.includes("affected"))).toStrictEqual(["method Order.most affected 8:16-8:26"])
  })

  it("makes a property of each key of a Python dictionary that is written as text and holds no function, at any depth", () => {
    expect(outlineOfCode("shop/config.py", "CONFIG = {", "    \"retries\": 3,", "    \"db\": {\"host\": \"local\"},", "    \"load\": lambda: 1,", "    LIMIT: 2,", "}")).toStrictEqual([
      "root-variable CONFIG 1:1-6:2",
      "  property retries 2:5-2:17",
      "  property db 3:5-3:28",
      "    property host 3:12-3:27",
      "  function 4:13-4:22",
    ])
  })

  it("marks the reader of a changed key of a Python dictionary, read by its key at any depth, and not the reader of another key", () => {
    const file = codeOf(
      "CONFIG = {",
      "    \"retries\": 3,",
      "    \"db\": {\"host\": \"local\"},",
      "}",
      "def tries():",
      "    return CONFIG[\"retries\"]",
      "def host():",
      "    return CONFIG[\"db\"][\"host\"]",
    )

    expect(diffsIn({ "shop/config.py": file }, { "shop/config.py": [rangeAt(3, 20, 3, 27)] }).filter((line) => line.includes("affected"))).toStrictEqual(["function host affected 8:12-8:32"])
  })

  it("makes a property of a member first set through this in a TypeScript class, once, and none of one the class declares", () => {
    expect(outlineOfCode(
      "src/order.ts",
      "export class Order {",
      "  limit = 3",
      "  constructor() {",
      "    this.count = 0",
      "    this.limit = 5",
      "  }",
      "  add() {",
      "    this.count = this.count + 1",
      "  }",
      "}",
    )).toStrictEqual([
      "class Order 1:1-10:2",
      "  property Order.limit 2:3-2:12",
      "  method Order.constructor 3:3-6:4",
      "    property Order.count 4:5-4:19",
      "  method Order.add 7:3-9:4",
    ])
  })

  it("marks the class that extends a changed class and the method that reads the changed member it inherits, in TypeScript and in Python, and not a method that reads another member", () => {
    const script = {
      "src/order.ts": codeOf("import { Record } from \"./record\"", "export class Order extends Record {", "  most() {", "    return this.limit", "  }", "  name() {", "    return this.label", "  }", "}"),
      "src/record.ts": codeOf("export class Record {", "  limit = 3", "  label = \"record\"", "}"),
    }
    const python = codeOf(
      "class Record:",
      "    limit = 3",
      "    def __init__(self):",
      "        self.label = \"record\"",
      "class Order(Record):",
      "    def most(self):",
      "        return self.limit",
      "    def name(self):",
      "        return self.label",
    )

    expect(diffsIn(script, { "src/record.ts": [rangeAt(2, 11, 2, 12)] }).filter((line) => line.includes("affected"))).toStrictEqual(["class Order affected 2:28-2:34", "method Order.most affected 4:12-4:22"])
    expect(diffsIn({ "shop/order.py": python }, { "shop/order.py": [rangeAt(2, 13, 2, 14)] }).filter((line) => line.includes("affected"))).toStrictEqual(["class Order affected 5:13-5:19", "method Order.most affected 7:16-7:26"])
    expect(diffsIn({ "shop/order.py": python }, { "shop/order.py": [rangeAt(4, 22, 4, 30)] }).filter((line) => line.includes("affected"))).toStrictEqual(["class Order affected 5:13-5:19", "method Order.name affected 9:16-9:26"])
  })

  it("marks the reader that gets a changed key of a Python dictionary with get, once, and the reader of a key no one wrote under a changed key", () => {
    const file = codeOf(
      "CONFIG = {",
      "    \"retries\": 3,",
      "    \"db\": {\"host\": \"local\"},",
      "}",
      "def tries():",
      "    return CONFIG.get(\"retries\")",
      "def host():",
      "    return CONFIG.get(\"db\").get(\"host\")",
      "def port():",
      "    return CONFIG[\"db\"].get(\"port\", 80)",
    )

    expect(diffsIn({ "shop/config.py": file }, { "shop/config.py": [rangeAt(2, 16, 2, 17)] }).filter((line) => line.includes("affected"))).toStrictEqual(["function tries affected 6:12-6:33"])
    expect(diffsIn({ "shop/config.py": file }, { "shop/config.py": [rangeAt(3, 20, 3, 27)] }).filter((line) => line.includes("affected"))).toStrictEqual(["function host affected 8:12-8:40", "function port affected 10:12-10:40"])
  })

  it("marks the reader of a changed key of a Python dictionary of another file", () => {
    const sources = [
      { filePath: "shop/config.py", source: codeOf("CONFIG = {", "    \"retries\": 3,", "    \"limit\": 2,", "}"), imports: {}, changed: [rangeAt(2, 16, 2, 17)] },
      {
        filePath: "shop/page.py",
        source: codeOf("from shop.config import CONFIG", "def tries():", "    return CONFIG[\"retries\"]", "def most():", "    return CONFIG.get(\"limit\")"),
        imports: { "shop.config:CONFIG": "shop/config.py" },
        changed: [],
      },
    ]
    const group = buildStoredCodeGroupGraph(
      sources.map(({ filePath, source, imports, changed }) => ({
        filePath,
        source,
        importedFilePaths: new Map(Object.entries(imports)),
        importedBy: [],
        diffs: changed.map((range) => ({ type: "modified" as const, range })),
      })),
    )

    expect(diffsOf(group).filter((line) => line.includes("affected"))).toStrictEqual(["function tries affected 3:12-3:29"])
  })

  it("marks the reader of a changed key of a store, and not the reader of another key", () => {
    const files = { "src/cart-store.ts": STORE, "src/summary.tsx": SUMMARY }

    expect(diffsIn(files, { "src/cart-store.ts": [rangeAt(4, 10, 4, 14)] }).filter((line) => line.includes("affected") && !line.includes("component-effect"))).toStrictEqual(["function - affected 3:41-3:52"])
  })

  it("marks the reader of a changed key of an object, at any depth", () => {
    const files = {
      "src/api.ts": codeOf("export const api = {", "  retries: 3,", "  users: { limit: 10 },", "}"),
      "src/page.ts": codeOf("import { api } from \"./api\"", "export const tries = () => api.retries", "export const most = () => api.users.limit"),
    }

    expect(diffsIn(files, { "src/api.ts": [rangeAt(3, 19, 3, 21)] }).filter((line) => line.includes("affected"))).toStrictEqual(["function most affected 3:27-3:42"])
  })

  it("keeps the chain of a block that reads a key of a store as it was: through the store", () => {
    const group = groupOf({ "src/cart-store.ts": STORE, "src/summary.tsx": SUMMARY }, { "src/cart-store.ts": [rangeAt(4, 10, 4, 14)] })
    const changed = group.codeBlocks.filter((block) => block.diffs.some((diff) => diff.type === "modified"))

    expect(changed.map((block) => [block.type, block.name])).toStrictEqual([["property", "promo"]])
    expect(blockNamed(group, "component", "Summary").diffSourceIds).toStrictEqual([changed[0].parentBlockId])
  })
})
