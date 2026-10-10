import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const PRICING = "src/pricing.ts"
const CANDIDATE_NAMES = ["priceOf", "price", "cost", "default", "pricing"]
const SOURCE_NAMES_OF: Readonly<Record<string, readonly string[]>> = { priceOf: ["priceOf", "*"], default: ["default"] }

describe.each(SCRIPT_DIALECTS)("the exports of %s", (_name, { fileOf, syntaxOf }) => {
  const exportedNamesIn = (...lines: readonly string[]): string[] => {
    const source = sourceOf(...lines)
    const file = fileOf(source)
    return syntaxOf(source).rootEncapsulations.flatMap((encapsulation) => file.listExportedNamesOf(encapsulation.name))
  }

  const forwardedNamesIn = (name: string, ...lines: readonly string[]): string[] => {
    const file = fileOf(sourceOf(...lines), { "./pricing": PRICING })
    return CANDIDATE_NAMES.filter((exportedName) => file.listReExportedSymbols(exportedName).some((handedOn) => handedOn.filePath === PRICING && SOURCE_NAMES_OF[name].includes(handedOn.name)))
  }

  it.each([
    ["an exported function", ["export function priceOf() {}"], ["priceOf"]],
    ["a named default function", ["export default function priceOf() {}"], ["priceOf", "default"]],
    ["a named default class", ["export default class Cart {}"], ["Cart", "default"]],
    ["a default function without a name", ["export default function () {}"], ["default"]],
    ["a function exported as the default by name", ["function priceOf() {}", "export default priceOf"], ["priceOf", "default"]],
    ["a function exported under another name", ["function priceOf() {}", "export { priceOf as price }"], ["priceOf", "price"]],
    ["a function exported under two names", ["function priceOf() {}", "export { priceOf, priceOf as default }"], ["priceOf", "default"]],
    ["a function exported under a quoted name", ["function priceOf() {}", "export { priceOf as \"price of\" }"], ["priceOf", "price of"]],
  ])("lists the names importers know %s by", (_form, lines, names) => {
    expect(exportedNamesIn(...lines)).toStrictEqual(names)
  })

  it.each([
    ["a re-export of the name", ["export { priceOf } from \"./pricing\""], ["priceOf"]],
    ["a re-export under another name", ["export { priceOf as price } from \"./pricing\""], ["price"]],
    ["a re-export as the default", ["export { priceOf as default } from \"./pricing\""], ["default"]],
    ["a re-export of everything", ["export * from \"./pricing\""], ["priceOf"]],
    ["a type re-export", ["export type { priceOf } from \"./pricing\""], ["priceOf"]],
    ["an import exported again", ["import { priceOf } from \"./pricing\"", "export { priceOf }"], ["priceOf"]],
    ["an import exported under another name", ["import { priceOf as price } from \"./pricing\"", "export { price as cost }"], ["cost"]],
    ["an import exported as the default", ["import { priceOf } from \"./pricing\"", "export default priceOf"], ["default"]],
    ["a namespace import exported again", ["import * as pricing from \"./pricing\"", "export { pricing }"], ["pricing"]],
  ])("hands a name on through %s", (_form, lines, names) => {
    expect(forwardedNamesIn("priceOf", ...lines)).toStrictEqual(names)
  })

  it.each([
    ["an import the file does not export", ["import { priceOf } from \"./pricing\"", "priceOf()"]],
    ["a re-export of another name", ["export { taxOf } from \"./pricing\""]],
    ["a re-export from another file", ["export { priceOf } from \"./legacy\""]],
    ["no exports", ["const total = 1"]],
  ])("hands nothing on through %s", (_form, lines) => {
    expect(forwardedNamesIn("priceOf", ...lines)).toStrictEqual([])
  })

  it("does not hand the default export on through a re-export of everything", () => {
    expect(forwardedNamesIn("default", "export * from \"./pricing\"")).toStrictEqual([])
    expect(forwardedNamesIn("default", "export { default } from \"./pricing\"")).toStrictEqual(["default"])
  })
})
