import { ASTCodeGroupGraph, readASTCodeGroupGraph, type DiffLocation, type LineRange } from "@/ast-graph"
import type { DiagramNode } from "@/core/types"
import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT } from "@/import-graph/__tests__/fake-git-adapter"
import type { ImportGraphFile } from "@/import-graph/trace-import-graph"

interface GroupFile {
  readonly filePath: string
  readonly lines: readonly string[]
  readonly imports?: Readonly<Record<string, string>>
  readonly diffLines?: readonly LineRange[]
}

const NESTING_INDENT = "  "

const groupOf = (files: readonly GroupFile[]): ASTCodeGroupGraph =>
  new ASTCodeGroupGraph(
    files.map(({ filePath, lines, imports = {}, diffLines = [] }) => ({
      filePath,
      gitSha: HEAD_COMMIT,
      source: lines.join("\n"),
      importedBy: [],
      importsTo: Object.values(imports),
      importedFilePaths: new Map(Object.entries(imports)),
      diffLines,
    })),
  )

const usedAt = ({ calledAt }: DiagramNode): string => (calledAt === undefined ? "" : ` used at ${String(calledAt.start.line)}`)

const outlineOf = (node: DiagramNode, indent = ""): string[] => [
  `${indent}${node.code.name} ${node.code.file}${usedAt(node)}`,
  ...node.callers.flatMap((caller) => outlineOf(caller, `${indent}${NESTING_INDENT}`)),
]

const traceIn = (files: readonly GroupFile[]): string[][] => groupOf(files).traceAllDiffUsage().map((tree) => outlineOf(tree))

const PRICING: GroupFile = {
  filePath: "src/pricing.ts",
  lines: ["export function priceOf(item) {", "  if (item.onSale) {", "    return item.price * 0.9", "  }", "  return item.price", "}"],
  diffLines: [[2, 3]],
}

const CHECKOUT: GroupFile = {
  filePath: "src/checkout.ts",
  lines: ["import { subtotal } from \"./cart\"", "", "export function checkout(cart) {", "  const total = subtotal(cart.items)", "  return total", "}"],
  imports: { "./cart": "src/cart.ts" },
}

const UI: GroupFile = {
  filePath: "src/ui.ts",
  lines: ["import { checkout } from \"./checkout\"", "", "export function CheckoutButton(cart) {", "  return checkout(cart)", "}"],
  imports: { "./checkout": "src/checkout.ts" },
}

const cartImporting = (specifier: string, filePath: string, imported = "priceOf", used = "priceOf"): GroupFile => ({
  filePath: "src/cart.ts",
  lines: [
    `import { ${imported} } from "${specifier}"`,
    "",
    "export function subtotal(items) {",
    `  return items.reduce((sum, item) => sum + ${used}(item), 0)`,
    "}",
  ],
  imports: { [specifier]: filePath },
})

const CLIMB = [
  "priceOf src/pricing.ts",
  "  subtotal src/cart.ts used at 4",
  "    checkout src/checkout.ts used at 4",
  "      CheckoutButton src/ui.ts used at 4",
]

describe("ASTCodeGroupGraph", () => {
  describe("the files of a group", () => {
    it("builds one file of the AST graph per file, with the class of its language", () => {
      const group = groupOf([
        { filePath: "src/a.ts", lines: [] },
        { filePath: "src/b.tsx", lines: [] },
        { filePath: "src/c.js", lines: [] },
        { filePath: "src/d.vue", lines: [] },
        { filePath: "shop/e.py", lines: [] },
      ])

      expect(group.astGraphFiles.map((file) => [file.filePath, file.constructor.name])).toStrictEqual([
        ["src/a.ts", "TypescriptASTGraphFile"],
        ["src/b.tsx", "JSXASTGraphFile"],
        ["src/c.js", "JSXASTGraphFile"],
        ["src/d.vue", "VueASTGraphFile"],
        ["shop/e.py", "PythonASTGraphFile"],
      ])
    })

    it("leaves out a file no language reads", () => {
      const group = groupOf([{ filePath: "README.md", lines: ["# Shop"] }, PRICING])

      expect(group.astGraphFiles.map((file) => file.filePath)).toStrictEqual(["src/pricing.ts"])
    })
  })

  describe("traceAllDiffUsage", () => {
    it("climbs from a changed function through every file that uses it, to the one nothing uses", () => {
      expect(traceIn([PRICING, cartImporting("./pricing", "src/pricing.ts"), CHECKOUT, UI])).toStrictEqual([CLIMB])
    })

    it("follows a re-export of everything", () => {
      const barrel: GroupFile = { filePath: "src/index.ts", lines: ["export * from \"./pricing\""], imports: { "./pricing": "src/pricing.ts" } }

      expect(traceIn([PRICING, barrel, cartImporting("./index", "src/index.ts"), CHECKOUT, UI])).toStrictEqual([CLIMB])
    })

    it("follows a re-export under another name", () => {
      const barrel: GroupFile = {
        filePath: "src/index.ts",
        lines: ["export { priceOf as price } from \"./pricing\""],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, barrel, cartImporting("./index", "src/index.ts", "price", "price"), CHECKOUT, UI])).toStrictEqual([CLIMB])
    })

    it("follows a re-export as a namespace", () => {
      const barrel: GroupFile = { filePath: "src/index.ts", lines: ["export * as pricing from \"./pricing\""], imports: { "./pricing": "src/pricing.ts" } }

      expect(traceIn([PRICING, barrel, cartImporting("./index", "src/index.ts", "pricing", "pricing.priceOf")])).toStrictEqual([
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it("follows an import that a file exports again", () => {
      const barrel: GroupFile = {
        filePath: "src/index.ts",
        lines: ["import { priceOf } from \"./pricing\"", "export { priceOf as price }"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, barrel, cartImporting("./index", "src/index.ts", "price", "price")])).toStrictEqual([
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it("does not hand on an import the file does not export", () => {
      const main: GroupFile = {
        filePath: "src/main.ts",
        lines: ["import { priceOf } from \"./cart\"", "export const run = () => priceOf({ price: 1 })"],
        imports: { "./cart": "src/cart.ts" },
      }

      expect(traceIn([PRICING, cartImporting("./pricing", "src/pricing.ts"), main])).toStrictEqual([
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it("does not count a namespace import of a file that only hands the name on", () => {
      const barrel: GroupFile = { filePath: "src/index.ts", lines: ["export * from \"./pricing\"", "export const VERSION = 1"], imports: { "./pricing": "src/pricing.ts" } }
      const main: GroupFile = {
        filePath: "src/main.ts",
        lines: ["import * as shop from \"./index\"", "export const run = () => shop.VERSION"],
        imports: { "./index": "src/index.ts" },
      }

      expect(traceIn([PRICING, barrel, main])).toStrictEqual([["priceOf src/pricing.ts"]])
    })

    it("follows a name through a chain of re-exports", () => {
      const inner: GroupFile = { filePath: "src/shop/index.ts", lines: ["export * from \"../pricing\""], imports: { "../pricing": "src/pricing.ts" } }
      const outer: GroupFile = { filePath: "src/index.ts", lines: ["export { priceOf } from \"./shop\""], imports: { "./shop": "src/shop/index.ts" } }

      expect(traceIn([PRICING, inner, outer, cartImporting("./index", "src/index.ts")])).toStrictEqual([
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it("ends when two files re-export each other", () => {
      const one: GroupFile = { filePath: "src/one.ts", lines: ["export * from \"./two\"", "export * from \"./pricing\""], imports: { "./two": "src/two.ts", "./pricing": "src/pricing.ts" } }
      const two: GroupFile = { filePath: "src/two.ts", lines: ["export * from \"./one\""], imports: { "./one": "src/one.ts" } }

      expect(traceIn([PRICING, one, two, cartImporting("./two", "src/two.ts")])).toStrictEqual([
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it.each([
      ["a named default function", ["export default function priceOf(item) {", "  return item.price", "}"]],
      ["a function exported as the default by name", ["function priceOf(item) {", "  return item.price", "}", "export default priceOf"]],
      ["a function exported as the default in a clause", ["function priceOf(item) {", "  return item.price", "}", "export { priceOf as default }"]],
      ["a default function without a name", ["export default function (item) {", "  return item.price", "}"]],
    ])("finds the importers of %s under the default import", (_form, lines) => {
      const pricing: GroupFile = { filePath: "src/pricing.ts", lines, diffLines: [[2, 2]] }
      const cart: GroupFile = {
        filePath: "src/cart.ts",
        lines: ["import price from \"./pricing\"", "export const subtotal = (items) => items.map(price)"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([pricing, cart]).map(([, ...callers]) => callers)).toStrictEqual([["  subtotal src/cart.ts used at 2"]])
    })

    it("does not hand the default export on through a re-export of everything", () => {
      const pricing: GroupFile = { filePath: "src/pricing.ts", lines: ["export default function priceOf(item) {", "  return item.price", "}"], diffLines: [[2, 2]] }
      const barrel: GroupFile = { filePath: "src/index.ts", lines: ["export * from \"./pricing\""], imports: { "./pricing": "src/pricing.ts" } }
      const cart: GroupFile = {
        filePath: "src/cart.ts",
        lines: ["import price from \"./index\"", "export const subtotal = (items) => items.map(price)"],
        imports: { "./index": "src/index.ts" },
      }

      expect(traceIn([pricing, barrel, cart])).toStrictEqual([["priceOf src/pricing.ts"]])
    })

    it("starts from the nearest encapsulation of the change and climbs through the one that holds it", () => {
      const page: GroupFile = {
        filePath: "src/ReviewPage.tsx",
        lines: [
          "export function ReviewPage({ reviewId }) {",
          "  const handleSave = () => {",
          "    saveReview(reviewId)",
          "  }",
          "  return <button onClick={handleSave} />",
          "}",
        ],
        diffLines: [[3, 3]],
      }
      const routes: GroupFile = {
        filePath: "src/routes.tsx",
        lines: ["import { ReviewPage } from \"./ReviewPage\"", "export const Routes = () => <ReviewPage reviewId=\"1\" />"],
        imports: { "./ReviewPage": "src/ReviewPage.tsx" },
      }

      expect(traceIn([page, routes])).toStrictEqual([
        ["ReviewPage.handleSave src/ReviewPage.tsx", "  ReviewPage src/ReviewPage.tsx used at 5", "    Routes src/routes.tsx used at 2"],
      ])
    })

    it("traces a changed method through the uses of its class", () => {
      const checkout: GroupFile = {
        filePath: "src/checkout.ts",
        lines: ["export class Checkout {", "  total(cart) {", "    return cart.total * 1.2", "  }", "}"],
        diffLines: [[3, 3]],
      }
      const ui: GroupFile = {
        filePath: "src/ui.ts",
        lines: ["import { Checkout } from \"./checkout\"", "export function CheckoutButton(cart) {", "  return new Checkout().total(cart)", "}"],
        imports: { "./checkout": "src/checkout.ts" },
      }

      expect(traceIn([checkout, ui])).toStrictEqual([["Checkout.total src/checkout.ts", "  CheckoutButton src/ui.ts used at 3"]])
    })

    it("does not take a parameter or a variable named like a method for the method", () => {
      const checkout: GroupFile = {
        filePath: "src/checkout.ts",
        lines: ["export class Checkout {", "  set total(total) {", "    this.sum = total", "  }", "  tax(rate) {", "    const tax = rate * 2", "    return tax", "  }", "}"],
        diffLines: [[3, 3], [6, 6]],
      }

      expect(traceIn([checkout])).toStrictEqual([["Checkout.total src/checkout.ts"], ["Checkout.tax src/checkout.ts"]])
    })

    it("names a method that uses the change by its class", () => {
      const ui: GroupFile = {
        filePath: "src/ui.ts",
        lines: ["import { priceOf } from \"./pricing\"", "export class Cart {", "  total(item) {", "    return priceOf(item)", "  }", "}"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, ui])).toStrictEqual([["priceOf src/pricing.ts", "  Cart.total src/ui.ts used at 4"]])
    })

    it("traces a changed module-level value to the functions that use it", () => {
      const limits: GroupFile = { filePath: "src/limits.ts", lines: ["export const MIN_FIRSTNAME_LENGTH = 3"], diffLines: [[1, 1]] }
      const validation: GroupFile = {
        filePath: "src/validation.ts",
        lines: [
          "import { MIN_FIRSTNAME_LENGTH } from \"./limits\"",
          "export function validateFirstname(name) {",
          "  return name.length >= MIN_FIRSTNAME_LENGTH",
          "}",
        ],
        imports: { "./limits": "src/limits.ts" },
      }

      expect(traceIn([limits, validation])).toStrictEqual([["MIN_FIRSTNAME_LENGTH src/limits.ts", "  validateFirstname src/validation.ts used at 3"]])
    })

    it("counts a caller once, at its first use", () => {
      const cart: GroupFile = {
        filePath: "src/cart.ts",
        lines: ["import { priceOf } from \"./pricing\"", "export function range(items) {", "  const low = priceOf(items[0])", "  return [low, priceOf(items[1])]", "}"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, cart])).toStrictEqual([["priceOf src/pricing.ts", "  range src/cart.ts used at 3"]])
    })

    it("finds the uses inside the file of the change", () => {
      const pricing: GroupFile = {
        filePath: "src/pricing.ts",
        lines: ["function discountOf(item) {", "  return item.price * 0.1", "}", "export function priceOf(item) {", "  return item.price - discountOf(item)", "}"],
        diffLines: [[2, 2]],
      }

      expect(traceIn([pricing, cartImporting("./pricing", "src/pricing.ts")])).toStrictEqual([
        ["discountOf src/pricing.ts", "  priceOf src/pricing.ts used at 5", "    subtotal src/cart.ts used at 4"],
      ])
    })

    it("ends at a function that uses itself, and at two that use each other", () => {
      const walk: GroupFile = {
        filePath: "src/walk.ts",
        lines: [
          "export function visit(node) {",
          "  return node.children.map(visit).concat(enter(node))",
          "}",
          "export function enter(node) {",
          "  return visit(node.first)",
          "}",
        ],
        diffLines: [[2, 2]],
      }

      expect(traceIn([walk])).toStrictEqual([["visit src/walk.ts", "  enter src/walk.ts used at 5"]])
    })

    it("does not connect another variable of the same name", () => {
      const cart: GroupFile = {
        filePath: "src/cart.ts",
        lines: ["import { taxOf } from \"./pricing\"", "export function subtotal(items, priceOf) {", "  return items.map(priceOf).map(taxOf)", "}"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, cart])).toStrictEqual([["priceOf src/pricing.ts"]])
    })

    it("gives a use outside every encapsulation no caller", () => {
      const main: GroupFile = {
        filePath: "src/main.ts",
        lines: ["import { priceOf } from \"./pricing\"", "priceOf({ price: 1 })"],
        imports: { "./pricing": "src/pricing.ts" },
      }

      expect(traceIn([PRICING, main])).toStrictEqual([["priceOf src/pricing.ts"]])
    })

    it("traces every changed encapsulation of every file once", () => {
      const pricing: GroupFile = { ...PRICING, diffLines: [[2, 2], [5, 5]] }
      const checkout: GroupFile = { ...CHECKOUT, diffLines: [[4, 4]] }

      expect(traceIn([pricing, cartImporting("./pricing", "src/pricing.ts"), checkout, UI])).toStrictEqual([
        CLIMB,
        ["checkout src/checkout.ts", "  CheckoutButton src/ui.ts used at 4"],
      ])
    })

    it("traces nothing when no file of the group has changed lines in an encapsulation", () => {
      expect(traceIn([{ ...PRICING, diffLines: [] }, cartImporting("./pricing", "src/pricing.ts")])).toStrictEqual([])
    })

    it("climbs through Python modules", () => {
      const pricing: GroupFile = { filePath: "shop/pricing.py", lines: ["def price_of(item):", "    return item.price"], diffLines: [[2, 2]] }
      const cart: GroupFile = {
        filePath: "shop/cart.py",
        lines: ["from shop.pricing import price_of", "", "", "class Cart:", "    def subtotal(self, items):", "        return sum(price_of(item) for item in items)"],
        imports: { "shop.pricing:price_of": "shop/pricing.py" },
      }
      const page: GroupFile = {
        filePath: "shop/page.py",
        lines: ["from shop import cart", "", "", "def render(items):", "    return cart.Cart().subtotal(items)"],
        imports: { "shop:cart": "shop/cart.py" },
      }

      expect(traceIn([pricing, cart, page])).toStrictEqual([
        ["price_of shop/pricing.py", "  Cart.subtotal shop/cart.py used at 6", "    render shop/page.py used at 5"],
      ])
    })

    it("follows a name a Python package imports for its importers", () => {
      const pricing: GroupFile = { filePath: "shop/pricing.py", lines: ["def price_of(item):", "    return item.price"], diffLines: [[2, 2]] }
      const init: GroupFile = { filePath: "shop/__init__.py", lines: ["from shop.pricing import price_of"], imports: { "shop.pricing:price_of": "shop/pricing.py" } }
      const page: GroupFile = {
        filePath: "app/page.py",
        lines: ["from shop import price_of", "", "", "def render(item):", "    return price_of(item)"],
        imports: { "shop:price_of": "shop/__init__.py" },
      }

      expect(traceIn([pricing, init, page])).toStrictEqual([["price_of shop/pricing.py", "  render app/page.py used at 5"]])
    })

    it("climbs from a Vue component to the template that renders it", () => {
      const button: GroupFile = {
        filePath: "src/SaveButton.vue",
        lines: ["<script setup lang=\"ts\">", "const label = \"Save\"", "</script>", "", "<template>", "  <button>{{ label }}</button>", "</template>"],
        diffLines: [[6, 6]],
      }
      const page: GroupFile = {
        filePath: "src/ReviewPage.vue",
        lines: ["<script setup lang=\"ts\">", "import SaveButton from \"./SaveButton.vue\"", "</script>", "", "<template>", "  <SaveButton />", "</template>"],
        imports: { "./SaveButton.vue": "src/SaveButton.vue" },
      }
      const routes: GroupFile = {
        filePath: "src/routes.ts",
        lines: ["import ReviewPage from \"./ReviewPage.vue\"", "export const routes = [{ path: \"/\", component: ReviewPage }]"],
        imports: { "./ReviewPage.vue": "src/ReviewPage.vue" },
      }

      expect(traceIn([button, page, routes])).toStrictEqual([
        ["default src/SaveButton.vue", "  default src/ReviewPage.vue used at 6", "    routes src/routes.ts used at 2"],
      ])
    })
  })

  describe("traceDeepUsageFromAstGraphFile", () => {
    it("gives the node of the change where it is declared, with each caller where it uses the node below", () => {
      const group = groupOf([PRICING, cartImporting("./pricing", "src/pricing.ts")])
      const [pricing] = group.astGraphFiles
      const [diffLocation] = pricing.listDiffLocations()

      expect(group.traceDeepUsageFromAstGraphFile(pricing, diffLocation)).toStrictEqual({
        id: { file: "src/pricing.ts", line: 1 },
        code: {
          file: "src/pricing.ts",
          name: "priceOf",
          definedAt: { start: { line: 1, column: 16 }, end: { line: 1, column: 23 } },
          enclosingRange: { start: { line: 1, column: 0 }, end: { line: 6, column: 1 } },
        },
        callers: [
          {
            id: { file: "src/cart.ts", line: 3 },
            code: {
              file: "src/cart.ts",
              name: "subtotal",
              definedAt: { start: { line: 3, column: 16 }, end: { line: 3, column: 24 } },
              enclosingRange: { start: { line: 3, column: 0 }, end: { line: 5, column: 1 } },
            },
            calledAt: { start: { line: 4, column: 43 }, end: { line: 4, column: 50 } },
            callers: [],
          },
        ],
      })
    })

    it("traces from the location it is given, not from the other changes of the file", () => {
      const pricing: GroupFile = {
        filePath: "src/pricing.ts",
        lines: ["export const RATE = 0.9", "export function priceOf(item) {", "  return item.price * RATE", "}"],
        diffLines: [[1, 1], [3, 3]],
      }
      const group = groupOf([pricing])
      const [file] = group.astGraphFiles
      const locations: readonly DiffLocation[] = file.listDiffLocations()

      expect(locations.map((location) => outlineOf(group.traceDeepUsageFromAstGraphFile(file, location)))).toStrictEqual([
        ["RATE src/pricing.ts", "  priceOf src/pricing.ts used at 3"],
        ["priceOf src/pricing.ts"],
      ])
    })
  })

  describe("readASTCodeGroupGraph", () => {
    const importGraphFile = (filePath: string, gitSha: string, imports: Readonly<Record<string, string>> = {}): ImportGraphFile => ({
      filePath,
      gitSha,
      diffType: null,
      importedBy: [],
      importsTo: Object.values(imports),
      importedFilePaths: new Map(Object.entries(imports)),
    })

    it("reads each file at its own commit and places the changed lines it is given", async () => {
      const gitAdapter = createFakeGitAdapter({
        base: { "src/legacy.ts": "export function legacyPrice(item) {\n  return item.price\n}" },
        head: {
          "src/pricing.ts": PRICING.lines.join("\n"),
          "src/cart.ts": cartImporting("./pricing", "src/pricing.ts").lines.join("\n"),
        },
      })

      const group = await readASTCodeGroupGraph({
        gitAdapter,
        importGraph: [
          importGraphFile("src/cart.ts", HEAD_COMMIT, { "./pricing": "src/pricing.ts" }),
          importGraphFile("src/legacy.ts", BASE_COMMIT),
          importGraphFile("src/pricing.ts", HEAD_COMMIT),
        ],
        diffLines: new Map([
          ["src/pricing.ts", [[2, 3]]],
          ["src/legacy.ts", [[1, 3]]],
        ]),
      })

      expect(group.astGraphFiles.map((file) => [file.filePath, file.gitSha])).toStrictEqual([
        ["src/cart.ts", HEAD_COMMIT],
        ["src/legacy.ts", BASE_COMMIT],
        ["src/pricing.ts", HEAD_COMMIT],
      ])
      expect(group.traceAllDiffUsage().map((tree) => outlineOf(tree))).toStrictEqual([
        ["legacyPrice src/legacy.ts"],
        ["priceOf src/pricing.ts", "  subtotal src/cart.ts used at 4"],
      ])
    })

    it("reads the files of one commit in one batch", async () => {
      const gitAdapter = createFakeGitAdapter({ base: {}, head: { "src/pricing.ts": "", "src/cart.ts": "" } })
      const blobs = vi.spyOn(gitAdapter, "blobs")

      await readASTCodeGroupGraph({
        gitAdapter,
        importGraph: [importGraphFile("src/cart.ts", HEAD_COMMIT), importGraphFile("src/pricing.ts", HEAD_COMMIT)],
        diffLines: new Map(),
      })

      expect(blobs.mock.calls).toStrictEqual([[["src/cart.ts", "src/pricing.ts"], HEAD_COMMIT]])
    })

    it("leaves out a file the commit does not hold", async () => {
      const gitAdapter = createFakeGitAdapter({ base: {}, head: { "src/pricing.ts": "" } })

      const group = await readASTCodeGroupGraph({
        gitAdapter,
        importGraph: [importGraphFile("src/gone.ts", HEAD_COMMIT), importGraphFile("src/pricing.ts", HEAD_COMMIT)],
        diffLines: new Map(),
      })

      expect(group.astGraphFiles.map((file) => file.filePath)).toStrictEqual(["src/pricing.ts"])
    })
  })
})
