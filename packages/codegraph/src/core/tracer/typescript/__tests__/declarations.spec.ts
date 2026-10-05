import { describe, expect, it } from "vitest"
import { declarationsIn, type LocalDecl } from "@/core/tracer/typescript/declarations"
import { parse } from "@/core/tracer/typescript/estree"

async function decls(source: string): Promise<LocalDecl[]> {
  const tree = parse("sample.tsx", source)
  if (tree === null) throw new Error("did not parse")
  return await Promise.resolve(declarationsIn(tree))
}

const names = (list: LocalDecl[]): string[] => list.map((one) => one.name)

describe("function-like declarations", () => {
  it("finds a binding built by a call chain that is handed a function", async () => {
    const found = await decls(
      [
        "export const save = client({ name: \"save\" })",
        "  .schema(input)",
        "  .action(async ({ parsedInput }) => {",
        "    return parsedInput",
        "  })",
      ].join("\n"),
    )
    expect(names(found)).toStrictEqual(["save"])
    expect(found[0].enclosingRange.start.line).toBe(1)
    expect(found[0].enclosingRange.end.line).toBe(5)
  })

  it("finds a binding whose one call is handed a function", async () => {
    expect(names(await decls("export const handler = withAuth(async (request) => request)"))).toStrictEqual(["handler"])
  })

  it("ignores a call that is handed no function", async () => {
    expect(names(await decls(["const client = createClient({ url: \"x\" })", "const total = sum(1, 2).toFixed(2)"].join("\n")))).toStrictEqual([])
  })

  it("ignores data made by an array or promise method handed a function", async () => {
    const found = await decls(
      [
        "export function Picker({ lines }) {",
        "  const active = lines.filter(({ status }) => status === 'ACTIVE')",
        "  const options = lines.map((line) => ({ id: line.id })).sort((a, b) => a.id - b.id)",
        "  const loaded = fetch('/x').then((response) => response.json())",
        "  return null",
        "}",
      ].join("\n"),
    )
    expect(names(found)).toStrictEqual(["Picker"])
  })

  it("ignores a built binding that destructures", async () => {
    expect(names(await decls("const [value, setValue] = useState(() => 0)"))).toStrictEqual([])
  })

  it("finds named local functions inside a function, named after the one that holds them", async () => {
    const found = await decls(
      [
        "export function BasketForm() {",
        "  const onSubmit = () => {",
        "    function check() { return true }",
        "    return check()",
        "  }",
        "  const onReset = useCallback(() => {}, [])",
        "  return <form onSubmit={onSubmit} onReset={() => onReset()} />",
        "}",
      ].join("\n"),
    )
    expect(names(found)).toStrictEqual(["BasketForm", "BasketForm.onSubmit", "BasketForm.onSubmit.check", "BasketForm.onReset"])
    expect(found[1].enclosingRange.start.line).toBe(2)
    expect(found[1].enclosingRange.end.line).toBe(5)
  })

  it("finds a local function inside a class method", async () => {
    const found = await decls("class Cart { total() { const sum = () => 1; return sum() } }")
    expect(names(found)).toStrictEqual(["Cart.total", "Cart.total.sum"])
  })

  it("finds a function declaration", async () => {
    const found = await decls("function priceOf() { return 1 }")
    expect(names(found)).toStrictEqual(["priceOf"])
    expect(found[0].definedAt.start.line).toBe(1)
  })

  it("finds a const arrow function", async () => {
    expect(names(await decls("const priceOf = () => 1"))).toStrictEqual(["priceOf"])
  })

  it("finds a const function expression", async () => {
    expect(names(await decls("const f = function () {}"))).toStrictEqual(["f"])
  })

  it("unwraps export in front of a function", async () => {
    const found = await decls(
      ["export function foo() {}", "export const bar = () => {}"].join("\n"),
    )
    expect(names(found)).toStrictEqual(["foo", "bar"])
  })

  it("names a class method Class.method", async () => {
    const found = await decls("class StockService { hasStock() { return true } }")
    expect(names(found)).toStrictEqual(["StockService.hasStock"])
  })

  it("finds a class field holding an arrow function", async () => {
    expect(names(await decls("class S { run = () => {} }"))).toStrictEqual(["S.run"])
  })

  it("ignores a plain value binding", async () => {
    expect(await decls("const total = 1 + 2")).toStrictEqual([])
  })

  it("reports each declaration's own name line", async () => {
    const found = await decls(["function a() {}", "", "const b = () => {}"].join("\n"))
    expect(found.map((one) => [one.name, one.definedAt.start.line])).toStrictEqual([
      ["a", 1],
      ["b", 3],
    ])
  })
})
