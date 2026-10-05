import { readDeclarations } from "@/scaffold/declarations"

const SOURCE = [
  "import { rates } from \"./rates\"",
  "",
  "const LIMIT = 3",
  "export const priceOf = (sku: string): number =>",
  "  rates[sku]",
  "export function total(units: number): number {",
  "  const inner = () => units",
  "  return inner()",
  "}",
  "export class Cart {",
  "  private items: string[] = []",
  "  static make = () => new Cart()",
  "  add(item: string): void {",
  "    this.items = [...this.items, item]",
  "  }",
  "}",
  "export interface Line {",
  "  sku: string",
  "  price(): number",
  "}",
  "export type Money = number",
  "export enum Kind { A, B }",
  "declare function ambient(): void",
  "namespace Deep.Inner {",
  "  export const depth = 1",
  "}",
].join("\n")

describe("readDeclarations", () => {
  it("lists the declarations of a TypeScript file with their lines and kinds, members under their container", () => {
    expect(readDeclarations("src/cart.ts", SOURCE)).toStrictEqual([
      { name: "LIMIT", lineStart: 3, lineEnd: 3, kind: "other" },
      { name: "priceOf", lineStart: 4, lineEnd: 5, kind: "callable" },
      { name: "total", lineStart: 6, lineEnd: 9, kind: "callable" },
      { name: "Cart", lineStart: 10, lineEnd: 16, kind: "container" },
      { name: "Cart.items", lineStart: 11, lineEnd: 11, kind: "other" },
      { name: "Cart.make", lineStart: 12, lineEnd: 12, kind: "callable" },
      { name: "Cart.add", lineStart: 13, lineEnd: 15, kind: "callable" },
      { name: "Line", lineStart: 17, lineEnd: 20, kind: "container" },
      { name: "Line.sku", lineStart: 18, lineEnd: 18, kind: "other" },
      { name: "Line.price", lineStart: 19, lineEnd: 19, kind: "callable" },
      { name: "Money", lineStart: 21, lineEnd: 21, kind: "other" },
      { name: "Kind", lineStart: 22, lineEnd: 22, kind: "container" },
      { name: "Deep", lineStart: 24, lineEnd: 26, kind: "container" },
      { name: "Deep.depth", lineStart: 25, lineEnd: 25, kind: "other" },
    ])
  })

  it("reads JSX in a .tsx file and plain JavaScript in a .js file", () => {
    expect(readDeclarations("src/Badge.tsx", "export const Badge = () => <span>new</span>\n")).toStrictEqual([
      { name: "Badge", lineStart: 1, lineEnd: 1, kind: "callable" },
    ])
    expect(readDeclarations("lib/sum.js", "function sum(a, b) {\n  return a + b\n}\n")).toStrictEqual([
      { name: "sum", lineStart: 1, lineEnd: 3, kind: "callable" },
    ])
  })

  it("names a destructured declaration by its pattern", () => {
    expect(readDeclarations("src/a.ts", "const { a, b } = load()\n")).toStrictEqual([
      { name: "{ a, b }", lineStart: 1, lineEnd: 1, kind: "other" },
    ])
  })

  it("has no answer for a file in a language it cannot read, and for a file that does not parse", () => {
    expect(readDeclarations("tool.py", "def main():\n    pass\n")).toBeNull()
    expect(readDeclarations("README.md", "# Title\n")).toBeNull()
    expect(readDeclarations("src/broken.ts", "export const = (\n")).toBeNull()
  })

  it("finds nothing in a file that declares nothing", () => {
    expect(readDeclarations("src/run.ts", "start()\n")).toStrictEqual([])
  })
})
