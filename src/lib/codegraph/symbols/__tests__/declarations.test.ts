import { describe, expect, it } from "vitest"
import type { SymbolSpan } from "../spans"
import { declarationsIn } from "../declarations"
import { parse } from "../../tracer/typescript/estree"

async function declarations(source: string, file = "src/pricing.ts"): Promise<SymbolSpan[]> {
  const tree = parse(file, source)
  if (tree === null) throw new Error(`nothing parsed ${file}`)
  return declarationsIn(tree)
}

const named = (all: SymbolSpan[], name: string): SymbolSpan | undefined =>
  all.find((one) => one.name === name)

describe("what a file declares", () => {
  it("reports a function with its whole range and its name's position", async () => {
    const all = await declarations(
      ["export function priceOf(ids: string[]): number {", "  return ids.length", "}"].join("\n"),
    )
    expect(named(all, "priceOf")).toEqual({
      name: "priceOf",
      from: 1,
      to: 3,
      // `export` is column 1; the name starts at 17. Asking call hierarchy at
      // the start of the line was the bug this field exists to prevent.
      nameAt: { line: 1, column: 17 },
      kind: "callable",
    })
  })

  it("does not report a local variable, which is the bug that shaped this", async () => {
    // A language server reports `unique` as a child symbol of `priceOf`, so
    // "the innermost declaration the change fell in" picked a local and the
    // whole diagram came back empty. A body is not walked here at all.
    const all = await declarations(
      [
        "export function priceOf(ids: string[]): number {",
        "  const unique = new Set(ids)",
        "  return unique.size",
        "}",
      ].join("\n"),
    )
    expect(all.map((one) => one.name)).toEqual(["priceOf"])
  })

  it("treats a named arrow function as the callable it is", async () => {
    const all = await declarations("export const labelFor = (x: string) => x.trim()")
    expect(named(all, "labelFor")?.kind).toBe("callable")
  })

  it("treats a plain binding as a declaration that does not run", async () => {
    const all = await declarations("export const RETRIES = 3")
    expect(named(all, "RETRIES")?.kind).toBe("other")
  })

  it("reports every name one statement binds", async () => {
    const all = await declarations("const first = 1, second = 2")
    expect(all.map((one) => one.name)).toEqual(["first", "second"])
    // The statement, not the declarator: half a statement is a fragment.
    expect(named(all, "second")?.from).toBe(1)
  })

  it("descends into a class and qualifies its members", async () => {
    const all = await declarations(
      [
        "export class StockService {",
        "  private cache = new Map()",
        "  hasStock(id: string): boolean {",
        "    return true",
        "  }",
        "}",
      ].join("\n"),
    )
    expect(named(all, "StockService")?.kind).toBe("container")
    expect(named(all, "StockService.hasStock")).toMatchObject({ kind: "callable", from: 3, to: 5 })
    expect(named(all, "StockService.cache")?.kind).toBe("other")
  })

  it("treats a class field holding an arrow as callable", async () => {
    const all = await declarations(
      ["class Handler {", "  run = () => undefined", "}"].join("\n"),
    )
    expect(named(all, "Handler.run")?.kind).toBe("callable")
  })

  it("does not descend into a method body", async () => {
    const all = await declarations(
      [
        "class StockService {",
        "  hasStock(): boolean {",
        "    const cached = true",
        "    return cached",
        "  }",
        "}",
      ].join("\n"),
    )
    expect(all.map((one) => one.name)).toEqual(["StockService", "StockService.hasStock"])
  })

  it("reports interfaces, type aliases and enums, and calls none of them callable", async () => {
    const all = await declarations(
      [
        "export interface Order { id: string }",
        "export type Money = number",
        "export enum Kind { A, B }",
      ].join("\n"),
    )
    expect(named(all, "Order")?.kind).toBe("container")
    expect(named(all, "Order.id")?.kind).toBe("other")
    expect(named(all, "Money")?.kind).toBe("other")
    expect(named(all, "Kind")?.kind).toBe("container")
  })

  it("qualifies through a namespace", async () => {
    const all = await declarations("namespace Legacy {\n  export function old() {}\n}")
    expect(named(all, "Legacy.old")?.kind).toBe("callable")
  })

  it("reads an abstract class and its signatures", async () => {
    const all = await declarations(
      ["export abstract class Base {", "  abstract run(): void", "}"].join("\n"),
    )
    expect(named(all, "Base")?.kind).toBe("container")
    expect(named(all, "Base.run")?.kind).toBe("callable")
  })

  it("reads a generator and a default export", async () => {
    const all = await declarations(
      ["export async function* stream() {}", "export default function main() {}"].join("\n"),
    )
    expect(named(all, "stream")?.kind).toBe("callable")
    expect(named(all, "main")?.kind).toBe("callable")
  })

  it("declares nothing for a file of pure side effects, which is not the same as being unreadable", async () => {
    expect(await declarations('console.log("hi")')).toEqual([])
  })

  it("reads TSX", async () => {
    const all = await declarations(
      "export const App = () => <div>hi</div>",
      "src/App.tsx",
    )
    expect(named(all, "App")?.kind).toBe("callable")
  })
})

describe("members a constructor declares through its parameters", () => {
  it("reports a parameter property as a member of the class", async () => {
    // `constructor(private readonly folder: …)` declares a field and nothing in
    // the class body says so. Missing it meant `this.folder()` found no member.
    const all = await declarations(
      [
        "export class Tree {", //                              1
        "  constructor(", //                                   2
        "    private readonly folder: () => string,", //       3
        "    public name: string,", //                         4
        "    plain: number,", //                               5
        "  ) {}", //                                           6
        "}", //                                                7
      ].join("\n"),
    )
    expect(named(all, "Tree.folder")).toMatchObject({ kind: "other", from: 3 })
    expect(named(all, "Tree.name")).toMatchObject({ kind: "other" })
    // A plain parameter is not a member. The difference is the modifier, which
    // is how TypeScript spells it too.
    expect(named(all, "Tree.plain")).toBeUndefined()
  })
})
