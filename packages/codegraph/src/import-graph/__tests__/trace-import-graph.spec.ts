import { createImportGraphContext, diffTypesOf, traceImportGraph, type ImportGraphFile } from "@/import-graph"
import { splitDiff } from "@flightplan/git-forge"
import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeFiles } from "./fake-git-adapter"

const trace = async (filePath: string, head: FakeFiles, base: FakeFiles = head): Promise<ImportGraphFile[]> => {
  const gitAdapter = createFakeGitAdapter({ base, head })
  const context = await createImportGraphContext({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return await traceImportGraph(context, filePath)
}

const unchanged = (filePath: string, importedBy: string[], importsTo: string[]): ImportGraphFile => ({
  filePath,
  gitSha: HEAD_COMMIT,
  diffType: null,
  importedBy,
  importsTo,
})

const pathsOf = (files: readonly ImportGraphFile[]): string[] => files.map((file) => file.filePath)

const CHECKOUT_CHAIN: FakeFiles = {
  "src/page.ts": "import { checkout } from \"./checkout\"",
  "src/checkout.ts": "import { subtotal } from \"./cart\"",
  "src/cart.ts": "import { priceOf } from \"./pricing\"",
  "src/pricing.ts": "import { round } from \"./money\"",
  "src/money.ts": "export const round = Math.round",
}

describe("traceImportGraph", () => {
  it("traces the files that import a file, and the files it imports, to both ends", async () => {
    expect(await trace("src/cart.ts", CHECKOUT_CHAIN)).toStrictEqual([
      unchanged("src/cart.ts", ["src/checkout.ts"], ["src/pricing.ts"]),
      unchanged("src/checkout.ts", ["src/page.ts"], ["src/cart.ts"]),
      unchanged("src/money.ts", ["src/pricing.ts"], []),
      unchanged("src/page.ts", [], ["src/checkout.ts"]),
      unchanged("src/pricing.ts", ["src/cart.ts"], ["src/money.ts"]),
    ])
  })

  it("traces a file that nothing imports and that imports nothing as itself alone", async () => {
    expect(await trace("src/alone.ts", { ...CHECKOUT_CHAIN, "src/alone.ts": "export const alone = 1" })).toStrictEqual([
      unchanged("src/alone.ts", [], []),
    ])
  })

  it("leaves out what an importer imports beside the traced file", async () => {
    const traced = await trace("src/pricing.ts", {
      "src/checkout.ts": "import { priceOf } from \"./pricing\"\nimport { track } from \"./analytics\"",
      "src/pricing.ts": "export const priceOf = () => 1",
      "src/analytics.ts": "export const track = () => undefined",
    })

    expect(traced).toStrictEqual([
      unchanged("src/checkout.ts", [], ["src/pricing.ts"]),
      unchanged("src/pricing.ts", ["src/checkout.ts"], []),
    ])
  })

  it("leaves out the other importers of a file the traced file imports", async () => {
    const traced = await trace("src/checkout.ts", {
      "src/checkout.ts": "import { round } from \"./money\"",
      "src/refund.ts": "import { round } from \"./money\"",
      "src/money.ts": "export const round = Math.round",
    })

    expect(pathsOf(traced)).toStrictEqual(["src/checkout.ts", "src/money.ts"])
  })

  it("connects two traced files that import each other outside the path of the trace", async () => {
    const traced = await trace("src/cart.ts", {
      "src/page.ts": "import \"./cart\"\nimport \"./money\"",
      "src/cart.ts": "import \"./money\"",
      "src/money.ts": "",
    })

    expect(traced).toStrictEqual([
      unchanged("src/cart.ts", ["src/page.ts"], ["src/money.ts"]),
      unchanged("src/money.ts", ["src/cart.ts", "src/page.ts"], []),
      unchanged("src/page.ts", [], ["src/cart.ts", "src/money.ts"]),
    ])
  })

  it("ends at files that import each other in a circle", async () => {
    const traced = await trace("src/order.ts", {
      "src/order.ts": "import \"./customer\"",
      "src/customer.ts": "import \"./order\"",
    })

    expect(traced).toStrictEqual([
      unchanged("src/customer.ts", ["src/order.ts"], ["src/order.ts"]),
      unchanged("src/order.ts", ["src/customer.ts"], ["src/customer.ts"]),
    ])
  })

  it("counts a file as an importer only when its import resolves to the traced file", async () => {
    const traced = await trace("src/orders/pricing.ts", {
      "src/orders/pricing.ts": "export const priceOf = () => 1",
      "src/orders/checkout.ts": "import { priceOf } from \"./pricing\"",
      "src/refunds/pricing.ts": "export const refundOf = () => 1",
      "src/refunds/refund.ts": "import { refundOf } from \"./pricing\"",
      "src/notes.ts": "export const note = \"see ./pricing\"",
    })

    expect(pathsOf(traced)).toStrictEqual(["src/orders/checkout.ts", "src/orders/pricing.ts"])
  })

  it.each([
    ["the name of its folder", "src/app.ts", "import \"./orders\""],
    ["the index file by name", "src/app.ts", "import \"./orders/index\""],
    ["the current folder", "src/orders/app.ts", "import \".\""],
    ["the parent folder", "src/orders/items/app.ts", "import \"..\""],
    ["a re-export", "src/app.ts", "export * from \"./orders\""],
    ["a require call", "src/app.js", "const orders = require(\"./orders\")"],
    ["a type-only import", "src/app.ts", "import type { Order } from \"./orders\""],
    ["an import type", "src/app.ts", "let order: import(\"./orders\").Order"],
    ["the extension it is emitted with", "src/app.ts", "import \"./orders/index.js\""],
    ["a script block of a Vue file", "src/App.vue", "<script setup lang=\"ts\">\nimport \"./orders\"\n</script>"],
  ])("finds a file that imports an index file through %s", async (_form, importer, source) => {
    const traced = await trace("src/orders/index.ts", { "src/orders/index.ts": "", [importer]: source })

    expect(pathsOf(traced)).toStrictEqual([importer, "src/orders/index.ts"].sort())
  })

  it("does not count a dynamic import as an import", async () => {
    const traced = await trace("src/pricing.ts", {
      "src/pricing.ts": "export const priceOf = () => 1",
      "src/lazy.ts": "export const load = () => import(\"./pricing\")",
    })

    expect(traced).toStrictEqual([unchanged("src/pricing.ts", [], [])])
  })

  it("finds the importers of a file across the packages of a monorepo", async () => {
    const traced = await trace("packages/ui/src/button.tsx", {
      "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", main: "./src/index.ts" }),
      "packages/ui/src/index.ts": "export * from \"./button\"",
      "packages/ui/src/button.tsx": "export const Button = () => null",
      "apps/shop/tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
      "apps/shop/src/checkout.tsx": "import { Button } from \"@acme/ui\"",
      "apps/shop/src/page.tsx": "import { Checkout } from \"@/checkout\"",
      "apps/admin/src/page.tsx": "import { Button } from \"@acme/ui-kit\"",
    })

    expect(traced).toStrictEqual([
      unchanged("apps/shop/src/checkout.tsx", ["apps/shop/src/page.tsx"], ["packages/ui/src/index.ts"]),
      unchanged("apps/shop/src/page.tsx", [], ["apps/shop/src/checkout.tsx"]),
      unchanged("packages/ui/src/button.tsx", ["packages/ui/src/index.ts"], []),
      unchanged("packages/ui/src/index.ts", ["apps/shop/src/checkout.tsx"], ["packages/ui/src/button.tsx"]),
    ])
  })

  it("finds a file that imports the traced file through a path alias that names it", async () => {
    const traced = await trace("src/settings/load.ts", {
      "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@config": ["./src/settings/load.ts"] } } }),
      "src/settings/load.ts": "export const settings = {}",
      "src/app.ts": "import { settings } from \"@config\"",
    })

    expect(pathsOf(traced)).toStrictEqual(["src/app.ts", "src/settings/load.ts"])
  })

  it("marks how the change touched each traced file", async () => {
    const base: FakeFiles = {
      "src/checkout.ts": "import \"./cart\"",
      "src/cart.ts": "import \"./pricing\"",
      "src/pricing.ts": "export const priceOf = () => 1",
    }
    const head: FakeFiles = {
      "src/checkout.ts": "import \"./cart\"",
      "src/cart.ts": "import \"./pricing\"\nimport \"./discount\"",
      "src/pricing.ts": "export const priceOf = () => 1",
      "src/discount.ts": "export const discountOf = () => 0",
    }

    expect(await trace("src/cart.ts", head, base)).toStrictEqual([
      { filePath: "src/cart.ts", gitSha: HEAD_COMMIT, diffType: "modified", importedBy: ["src/checkout.ts"], importsTo: ["src/discount.ts", "src/pricing.ts"] },
      { filePath: "src/checkout.ts", gitSha: HEAD_COMMIT, diffType: null, importedBy: [], importsTo: ["src/cart.ts"] },
      { filePath: "src/discount.ts", gitSha: HEAD_COMMIT, diffType: "added", importedBy: ["src/cart.ts"], importsTo: [] },
      { filePath: "src/pricing.ts", gitSha: HEAD_COMMIT, diffType: null, importedBy: ["src/cart.ts"], importsTo: [] },
    ])
  })

  it("traces a deleted file in the commit before the change, and reads only deleted files there", async () => {
    const base: FakeFiles = {
      "src/checkout.ts": "import \"./legacy-pricing\"",
      "src/legacy-pricing.ts": "import \"./money\"",
      "src/money.ts": "export const round = Math.round",
    }
    const head: FakeFiles = {
      "src/checkout.ts": "export const checkout = () => 1",
      "src/money.ts": "export const round = Math.round",
    }

    expect(await trace("src/legacy-pricing.ts", head, base)).toStrictEqual([
      { filePath: "src/checkout.ts", gitSha: HEAD_COMMIT, diffType: "modified", importedBy: [], importsTo: ["src/legacy-pricing.ts"] },
      { filePath: "src/legacy-pricing.ts", gitSha: BASE_COMMIT, diffType: "deleted", importedBy: ["src/checkout.ts"], importsTo: ["src/money.ts"] },
      { filePath: "src/money.ts", gitSha: HEAD_COMMIT, diffType: null, importedBy: ["src/legacy-pricing.ts"], importsTo: [] },
    ])
  })

  it("traces a Python file through the modules that import it and the modules it imports", async () => {
    const traced = await trace("shop/orders/cart.py", {
      "shop/__init__.py": "",
      "shop/orders/__init__.py": "from .checkout import checkout",
      "shop/orders/checkout.py": "from . import (\n    cart,\n)",
      "shop/orders/cart.py": "from shop.orders.pricing import price_of",
      "shop/orders/pricing.py": "from ..money import round_half_up",
      "shop/money.py": "import decimal",
      "shop/payments/cart.py": "",
      "shop/payments/charge.py": "from . import cart",
      "shop/notes.py": "note = \"see cart\"",
      "web/app.py": "import shop.orders",
    })

    expect(traced).toStrictEqual([
      unchanged("shop/money.py", ["shop/orders/pricing.py"], []),
      unchanged("shop/orders/__init__.py", ["web/app.py"], ["shop/orders/checkout.py"]),
      unchanged("shop/orders/cart.py", ["shop/orders/checkout.py"], ["shop/orders/pricing.py"]),
      unchanged("shop/orders/checkout.py", ["shop/orders/__init__.py"], ["shop/orders/cart.py"]),
      unchanged("shop/orders/pricing.py", ["shop/orders/cart.py"], ["shop/money.py"]),
      unchanged("web/app.py", [], ["shop/orders/__init__.py"]),
    ])
  })

  it("keeps the files of one language out of the trace of another", async () => {
    const traced = await trace("tools/pricing.py", {
      "tools/pricing.py": "",
      "tools/report.py": "from . import pricing",
      "tools/pricing.ts": "",
      "tools/report.ts": "import \"./pricing\"",
    })

    expect(pathsOf(traced)).toStrictEqual(["tools/pricing.py", "tools/report.py"])
  })

  it("traces nothing for a file of no known language", async () => {
    expect(await trace("README.md", { "README.md": "import \"./src/app\"", "src/app.ts": "" })).toStrictEqual([])
  })

  it("traces nothing for a file that is not in the commit", async () => {
    expect(await trace("src/absent.ts", CHECKOUT_CHAIN)).toStrictEqual([])
  })

  it("searches for the importers of every file of a level in one search, and reads their files in one read", async () => {
    const files: FakeFiles = {
      "src/money.ts": "",
      "src/cart.ts": "import \"./money\"",
      "src/refund.ts": "import \"./money\"",
      "src/invoice.ts": "import \"./money\"",
      "src/cart-page.ts": "import \"./cart\"",
      "src/refund-page.ts": "import \"./refund\"",
      "src/invoice-page.ts": "import \"./invoice\"",
    }
    const gitAdapter = createFakeGitAdapter({ base: files, head: files })
    const searchFiles = vi.spyOn(gitAdapter, "searchFiles")
    const blobs = vi.spyOn(gitAdapter, "blobs")
    const context = await createImportGraphContext({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })

    const traced = await traceImportGraph(context, "src/money.ts")

    expect(traced).toHaveLength(Object.keys(files).length)
    expect(searchFiles).toHaveBeenCalledTimes(3)
    expect(blobs.mock.calls.map(([paths]) => [...paths].sort())).toStrictEqual([
      ["src/money.ts"],
      ["src/cart.ts", "src/invoice.ts", "src/refund.ts"],
      ["src/cart-page.ts", "src/invoice-page.ts", "src/refund-page.ts"],
    ])
  })

  it("answers two traces of one change from the same reading of the repository", async () => {
    const gitAdapter = createFakeGitAdapter({ base: CHECKOUT_CHAIN, head: CHECKOUT_CHAIN })
    const listFiles = vi.spyOn(gitAdapter, "listFiles")
    const blobs = vi.spyOn(gitAdapter, "blobs")
    const context = await createImportGraphContext({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })

    const [first, second] = await Promise.all([
      traceImportGraph(context, "src/cart.ts"),
      traceImportGraph(context, "src/money.ts"),
    ])

    expect(pathsOf(first)).toStrictEqual(pathsOf(second))
    expect(listFiles).toHaveBeenCalledTimes(1)
    expect(blobs.mock.calls.flatMap(([paths]) => paths).filter((path) => path === "src/cart.ts")).toHaveLength(1)
  })
})

describe("diffTypesOf", () => {
  it("reads how each file changed from the diff of the change", () => {
    const diff = [
      "diff --git a/src/cart.ts b/src/cart.ts",
      "--- a/src/cart.ts",
      "+++ b/src/cart.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/src/discount.ts b/src/discount.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/discount.ts",
      "@@ -0,0 +1 @@",
      "+new",
      "diff --git a/src/legacy.ts b/src/legacy.ts",
      "deleted file mode 100644",
      "--- a/src/legacy.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-old",
      "diff --git a/src/price.ts b/src/pricing.ts",
      "similarity index 100%",
      "rename from src/price.ts",
      "rename to src/pricing.ts",
    ].join("\n")

    expect([...diffTypesOf(splitDiff(diff))]).toStrictEqual([
      ["src/cart.ts", "modified"],
      ["src/discount.ts", "added"],
      ["src/legacy.ts", "deleted"],
      ["src/price.ts", "deleted"],
      ["src/pricing.ts", "added"],
    ])
  })

  it("reads a copied file as added", () => {
    expect([...diffTypesOf([{ path: "src/copy.ts", status: "copied" }])]).toStrictEqual([["src/copy.ts", "added"]])
  })
})
