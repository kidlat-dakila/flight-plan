import { readImportSpecifiers } from "@/import-graph/languages/typescript-specifiers"

const lines = (...source: string[]): string => source.join("\n")

const REQUIRE_OF_COMPUTED_PATH = ["const a = require(`./$", "{name}`)"].join("")

describe("readImportSpecifiers", () => {
  it.each([
    ["a default import", "import a from \"./default\"", "./default"],
    ["named imports", "import { a, b as c } from './named'", "./named"],
    ["a namespace import", "import * as all from \"./namespace\"", "./namespace"],
    ["a default import beside named imports", "import a, { b } from \"./mixed\"", "./mixed"],
    ["a default import beside a namespace import", "import a, * as all from \"./both\"", "./both"],
    ["an import for its side effects", "import \"./side-effect\"", "./side-effect"],
    ["a type-only import", "import type { A } from \"./type-only\"", "./type-only"],
    ["a type-only default import", "import type A from \"./type-default\"", "./type-default"],
    ["an inline type import", "import { type A, b } from \"./inline-type\"", "./inline-type"],
    ["an import with attributes", "import data from \"./data.json\" with { type: \"json\" }", "./data.json"],
    ["an import assigned from require", "import a = require(\"./import-equals\")", "./import-equals"],
    ["an exported import assigned from require", "export import a = require(\"./exported-equals\")", "./exported-equals"],
    ["a named re-export", "export { a, b as c } from \"./re-export\"", "./re-export"],
    ["a re-export of everything", "export * from \"./export-all\"", "./export-all"],
    ["a re-export under a namespace", "export * as all from \"./export-namespace\"", "./export-namespace"],
    ["a type-only re-export", "export type { A } from \"./export-type\"", "./export-type"],
    ["a require call", "const a = require(\"./required\")", "./required"],
    ["a require call inside a function", "function load() { return require(\"./lazy\") }", "./lazy"],
    ["a require call with a template literal", "const a = require(`./template`)", "./template"],
    ["a reference path directive", "/// <reference path=\"./ambient.d.ts\" />", "./ambient.d.ts"],
    ["a reference path directive with a bare file name", "/// <reference path=\"ambient.d.ts\" />", "./ambient.d.ts"],
  ])("reads %s", (_form, source, specifier) => {
    expect(readImportSpecifiers("src/order.ts", source)).toStrictEqual([specifier])
  })

  it.each([
    ["a type alias", "type A = import(\"./typed\").A"],
    ["a type annotation", "let a: import(\"./typed\").A"],
    ["a return type", "function a(): import(\"./typed\").A { return b }"],
    ["a type query", "type A = typeof import(\"./typed\")"],
    ["a type parameter's constraint", "function a<T extends import(\"./typed\").A>() {}"],
    ["a type parameter's default", "function a<T = import(\"./typed\").A>() {}"],
    ["an implements clause", "class A implements import(\"./typed\").B {}"],
    ["a satisfies expression", "const a = b satisfies import(\"./typed\").A"],
    ["an as expression", "const a = b as import(\"./typed\").A"],
  ])("reads an import type in %s", (_position, source) => {
    expect(readImportSpecifiers("src/order.ts", source)).toStrictEqual(["./typed"])
  })

  it.each([
    ["an awaited dynamic import", "const a = await import(\"./dynamic\")"],
    ["a dynamic import with a then", "import(\"./dynamic\").then((loaded) => loaded.run())"],
    ["a dynamic import returned from a typed function", "const load = (): Promise<A> => import(\"./dynamic\")"],
    ["a dynamic import cast to a type", "const a = (await import(\"./dynamic\")).b as B"],
    ["a dynamic import passed to a generic call", "const a = lazy<B>(() => import(\"./dynamic\"))"],
    ["a require call with a computed path", REQUIRE_OF_COMPUTED_PATH],
    ["a require call with a variable", "const a = require(name)"],
    ["a require.resolve call", "const a = require.resolve(\"./resolved\")"],
    ["a call of another function", "const a = load(\"./loaded\")"],
    ["a module declaration", "declare module \"./augmented\" { export const a: number }"],
    ["an ordinary comment that mentions an import", "// import a from \"./commented\""],
    ["a string that mentions an import", "const a = \"import b from './quoted'\""],
  ])("leaves out %s", (_form, source) => {
    expect(readImportSpecifiers("src/order.ts", source)).toStrictEqual([])
  })

  it("reads every import of a file once, in the order written", () => {
    const source = lines(
      "/// <reference path=\"./ambient.d.ts\" />",
      "import { placeOrder } from \"./place-order\"",
      "import type { Order } from \"./order\"",
      "import { hasStock } from \"./place-order\"",
      "export * from \"./order\"",
      "const legacy = require(\"./legacy\")",
    )

    expect(readImportSpecifiers("src/checkout.ts", source)).toStrictEqual([
      "./ambient.d.ts",
      "./place-order",
      "./order",
      "./legacy",
    ])
  })

  it("reads the imports of a file with JSX", () => {
    const source = lines(
      "import { Button } from \"./button\"",
      "export const Checkout = () => <Button label=\"Pay\" />",
    )

    expect(readImportSpecifiers("src/checkout.tsx", source)).toStrictEqual(["./button"])
    expect(readImportSpecifiers("src/checkout.jsx", source)).toStrictEqual(["./button"])
    expect(readImportSpecifiers("src/checkout.js", source)).toStrictEqual(["./button"])
  })

  it("reads the imports of a TypeScript file that asserts a type with angle brackets", () => {
    const source = lines("import { parse } from \"./parse\"", "const order = <Order>parse(text)")

    expect(readImportSpecifiers("src/checkout.ts", source)).toStrictEqual(["./parse"])
  })

  it("reads the imports of CommonJS and ES module files", () => {
    expect(readImportSpecifiers("src/checkout.cjs", "const a = require(\"./required\")")).toStrictEqual(["./required"])
    expect(readImportSpecifiers("src/checkout.mts", "import a from \"./imported.mjs\"")).toStrictEqual(["./imported.mjs"])
  })

  it("reads the imports of every script block of a Vue file", () => {
    const source = lines(
      "<script lang=\"ts\">",
      "import { defineComponent } from \"./define\"",
      "</script>",
      "<script setup lang=\"ts\">",
      "import Button from \"./Button.vue\"",
      "import type { Order } from \"./order\"",
      "</script>",
      "<template><Button /></template>",
      "<style>@import \"./checkout.css\";</style>",
    )

    expect(readImportSpecifiers("src/Checkout.vue", source)).toStrictEqual(["./define", "./Button.vue", "./order"])
  })

  it("reads a Vue script block written in JavaScript with JSX", () => {
    const source = lines(
      "<script setup>",
      "import Button from \"./Button.vue\"",
      "const render = () => <Button />",
      "</script>",
    )

    expect(readImportSpecifiers("src/Checkout.vue", source)).toStrictEqual(["./Button.vue"])
  })

  it("reads the file a Vue script block takes its code from", () => {
    expect(readImportSpecifiers("src/Checkout.vue", "<script lang=\"ts\" src=\"./checkout.ts\"></script>")).toStrictEqual([
      "./checkout.ts",
    ])
  })

  it("reads no imports from a file without any", () => {
    expect(readImportSpecifiers("src/order.ts", "export const total = 1")).toStrictEqual([])
    expect(readImportSpecifiers("src/order.ts", "")).toStrictEqual([])
    expect(readImportSpecifiers("src/Order.vue", "<template><p>Order</p></template>")).toStrictEqual([])
  })

  it("reads the imports written before a syntax error", () => {
    const source = lines("import { placeOrder } from \"./place-order\"", "const = = =")

    expect(readImportSpecifiers("src/order.ts", source)).toStrictEqual(["./place-order"])
  })
})
