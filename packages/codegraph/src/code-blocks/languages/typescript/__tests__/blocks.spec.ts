import { codeOf, groupOf, outlineOf } from "@/code-blocks/__tests__/group-fixture"

const outlineOfCode = (...lines: readonly string[]): string[] => outlineOf(groupOf({ "src/file.ts": codeOf(...lines) }), "src/file.ts")

describe("the blocks at the root of a TypeScript file", () => {
  it("makes a function block of a declared function and of a variable that holds one", () => {
    expect(outlineOfCode("function priceOf() {}", "export const taxOf = () => 1", "const sum = function () {}")).toStrictEqual([
      "function priceOf 1:1-1:22",
      "function taxOf 2:1-2:29",
      "function sum 3:1-3:27",
    ])
  })

  it("makes a hook block of a function whose name starts with use and a capital letter", () => {
    expect(outlineOfCode("const useOrders = () => 1", "function useCart() {}", "const user = () => 1")).toStrictEqual([
      "hook useOrders 1:1-1:26",
      "hook useCart 2:1-2:22",
      "function user 3:1-3:21",
    ])
  })

  it("makes a class block, with a method block named after the class for each function it holds", () => {
    expect(outlineOfCode("class OrdersService {", "  @Get()", "  findAll() {}", "  save = () => 1", "  limit = 5", "}")).toStrictEqual([
      "class OrdersService 1:1-6:2",
      "  method OrdersService.findAll 2:3-3:15",
      "  method OrdersService.save 4:3-4:17",
    ])
  })

  it("makes a root-variable of a value that is not a function or a class, one per declared variable", () => {
    expect(outlineOfCode("const MAX = 5", "export const STATUSES = [1]", "let a = 1, b = 2", "enum Color { Red }")).toStrictEqual([
      "root-variable MAX 1:1-1:14",
      "root-variable STATUSES 2:1-2:28",
      "root-variable a 3:5-3:10",
      "root-variable b 3:12-3:17",
      "root-variable Color 4:1-4:19",
    ])
  })

  it("makes a root-statement of a statement that is not a declaration, with the block of the statement inside it", () => {
    expect(outlineOfCode("start()", "if (ready) { start() }", "export { start }")).toStrictEqual([
      "root-statement 1:1-1:8",
      "root-statement 2:1-2:23",
      "  condition 2:1-2:23",
      "root-statement 3:1-3:17",
    ])
  })

  it("makes a type-declaration of an interface and of a type", () => {
    expect(outlineOfCode("interface User { id: string }", "export type Status = \"open\"", "declare const VERSION: string")).toStrictEqual([
      "type-declaration User 1:1-1:30",
      "type-declaration Status 2:1-2:28",
      "type-declaration 3:1-3:30",
    ])
  })

  it("makes an import of an import statement, of a re-export and of a required module", () => {
    expect(outlineOfCode("import { a } from \"./a\"", "export * from \"./b\"", "const c = require(\"./c\")")).toStrictEqual([
      "import 1:1-1:24",
      "import 2:1-2:20",
      "import 3:1-3:25",
    ])
  })

  it("names a default export that has no name of its own after the export", () => {
    expect(outlineOfCode("export default () => 1")).toStrictEqual(["function default 1:1-1:23"])
    expect(outlineOfCode("export default class {}")).toStrictEqual(["class default 1:1-1:24"])
    expect(outlineOfCode("export default { retries: 3 }")).toStrictEqual(["root-variable default 1:1-1:30"])
    expect(outlineOfCode("export default function priceOf() {}")).toStrictEqual(["function priceOf 1:1-1:37"])
  })

  it("makes one file block of a file that holds no block", () => {
    expect(outlineOfCode("// nothing here", "")).toStrictEqual(["file 1:1-2:1"])
  })
})

describe("the blocks inside a block of a TypeScript file", () => {
  it("makes a condition of an if and of a ternary", () => {
    expect(outlineOfCode("function check(a) {", "  if (a) { return 1 } else if (a > 2) { return 2 }", "  return a ? 1 : 2", "}")).toStrictEqual([
      "function check 1:1-4:2",
      "  root-argument-value a 1:16-1:17",
      "  condition 2:3-2:51",
      "    condition 2:28-2:51",
      "  condition 3:10-3:19",
    ])
  })

  it("makes a switch with a switch-case for each case", () => {
    expect(outlineOfCode("function check(a) {", "  switch (a) {", "    case 1: break", "    default: break", "  }", "}")).toStrictEqual([
      "function check 1:1-6:2",
      "  root-argument-value a 1:16-1:17",
      "  switch 2:3-5:4",
      "    switch-case 3:5-3:18",
      "    switch-case 4:5-4:19",
    ])
  })

  it("makes a loop of every kind of loop", () => {
    expect(outlineOfCode("function run() {", "  for (;;) {}", "  for (const a of b) {}", "  while (a) {}", "  do {} while (a)", "}")).toStrictEqual([
      "function run 1:1-6:2",
      "  loop 2:3-2:14",
      "  loop 3:3-3:24",
      "  loop 4:3-4:15",
      "  loop 5:3-5:18",
    ])
  })

  it("makes a try-catch of a try statement and a throw of a statement that raises an error", () => {
    expect(outlineOfCode("function run() {", "  try { go() } catch { throw new Error() }", "}")).toStrictEqual([
      "function run 1:1-3:2",
      "  try-catch 2:3-2:43",
      "    throw 2:24-2:41",
    ])
  })

  it("makes a function block of a function declared or written in place inside a block", () => {
    expect(outlineOfCode("function run() {", "  const go = () => 1", "  function stop() {}", "  return [() => 2, { save: () => 3, load() {} }]", "}")).toStrictEqual([
      "function run 1:1-5:2",
      "  function go 2:3-2:21",
      "  function stop 3:3-3:21",
      "  function 4:11-4:18",
      "  function save 4:22-4:35",
      "  function load 4:37-4:46",
    ])
  })

  it("makes no block of a declaration whose value comes from inside the root block", () => {
    expect(outlineOfCode("function check(b) {", "  const a = 1", "  const c = b + a", "}")).toStrictEqual([
      "function check 1:1-4:2",
      "  root-argument-value b 1:16-1:17",
    ])
  })

  it("makes an external-value of a declaration whose value comes from outside the root block", () => {
    expect(outlineOfCode("import { load } from \"lib\"", "const MAX = 3", "function check() {", "  const a = load()", "  const { b } = MAX", "}")).toStrictEqual([
      "import 1:1-1:27",
      "root-variable MAX 2:1-2:14",
      "function check 3:1-6:2",
      "  external-value a 4:3-4:19",
      "  external-value b 5:3-5:20",
    ])
  })

  it("reads an expression nested thousands of levels deep", () => {
    const sum = Array.from({ length: 4000 }, (_unused, index) => `price${String(index)}`).join(" + ")

    const declaration = `const total = () => ${sum}`

    expect(outlineOfCode(declaration)).toStrictEqual([`function total 1:1-1:${String(declaration.length + 1)}`])
  })

  it("makes a state or a derived block of a declaration whose value is made by a call the catalogue names", () => {
    const group = groupOf({
      "src/file.ts": codeOf(
        "import React, { useMemo, useState as useLocal } from \"react\"",
        "import { useState } from \"./mine\"",
        "const usePage = () => {",
        "  const [status, setStatus] = useLocal(\"open\")",
        "  const total = useMemo(() => 1, [])",
        "  const [step] = React.useReducer(reduce, 0)",
        "  const mine = useState(1)",
        "}",
      ),
    })

    expect(outlineOf(group, "src/file.ts").slice(3)).toStrictEqual([
      "  state status 4:3-4:47",
      "  derived total 5:3-5:37",
      "    component-effect 5:17-5:37",
      "      effect-callback 0 5:25-5:32",
      "        function 5:25-5:32",
      "  state step 6:3-6:45",
      "    component-effect 6:18-6:45",
      "      effect-callback 0 6:35-6:41",
      "  external-value mine 7:3-7:27",
    ])
    expect(group.codeBlocks.filter((block) => block.catalogue !== null).map((block) => [block.type, block.catalogue?.name, block.catalogue?.runs])).toStrictEqual([
      ["state", "useState", null],
      ["derived", "useMemo", null],
      ["component-effect", "useMemo", null],
      ["effect-callback", "useMemo", "in-place"],
      ["state", "useReducer", null],
      ["component-effect", "useReducer", null],
      ["effect-callback", "useReducer", "kept"],
    ])
  })

  it("derives the id of two calls that start at the same place from where each ends", () => {
    const group = groupOf({ "src/file.ts": codeOf("const stop = () => 1", "bus.on(\"a\", stop).on(\"b\", stop)") })

    expect(group.codeBlocks.filter((block) => block.type === "code-event").map((block) => block.id)).toStrictEqual([
      "src/file.ts#code-event@2:1",
      "src/file.ts#code-event@2:1-2:18",
    ])
  })
})
