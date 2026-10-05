import { describe, expect, it } from "vitest"
import { declarationsIn } from "@/core/symbols/declarations"
import type { SymbolSpan } from "@/core/symbols/spans"
import { parse } from "@/core/tracer/typescript/estree"

async function declarations(source: string, file = "src/pricing.ts"): Promise<SymbolSpan[]> {
  const tree = parse(file, source)
  if (tree === null) throw new Error(`nothing parsed ${file}`)
  return await Promise.resolve(declarationsIn(tree))
}

const named = (all: SymbolSpan[], name: string): SymbolSpan | undefined =>
  all.find((one) => one.name === name)

describe("what a file declares", () => {
  it("reports a function with its whole range and its name's position", async () => {
    const all = await declarations(
      ["export function priceOf(ids: string[]): number {", "  return ids.length", "}"].join("\n"),
    )
    expect(named(all, "priceOf")).toStrictEqual({
      name: "priceOf",
      from: 1,
      to: 3,
      nameAt: { line: 1, column: 17 },
      kind: "callable",
    })
  })

  it("does not report a local variable, which is the bug that shaped this", async () => {
    const all = await declarations(
      [
        "export function priceOf(ids: string[]): number {",
        "  const unique = new Set(ids)",
        "  return unique.size",
        "}",
      ].join("\n"),
    )
    expect(all.map((one) => one.name)).toStrictEqual(["priceOf"])
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
    expect(all.map((one) => one.name)).toStrictEqual(["first", "second"])
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
    expect(all.map((one) => one.name)).toStrictEqual(["StockService", "StockService.hasStock"])
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
    expect(await declarations("console.log(\"hi\")")).toStrictEqual([])
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
    const all = await declarations(
      [
        "export class Tree {",
        "  constructor(",
        "    private readonly folder: () => string,",
        "    public name: string,",
        "    plain: number,",
        "  ) {}",
        "}",
      ].join("\n"),
    )
    expect(named(all, "Tree.folder")).toMatchObject({ kind: "other", from: 3 })
    expect(named(all, "Tree.name")).toMatchObject({ kind: "other" })
    expect(named(all, "Tree.plain")).toBeUndefined()
  })
})
