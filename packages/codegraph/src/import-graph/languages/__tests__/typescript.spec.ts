import { createFakeGitAdapter, HEAD_COMMIT, type FakeFiles } from "@/import-graph/__tests__/fake-git-adapter"
import type { ImportReader } from "@/import-graph/languages/language"
import { typescriptImportLanguage } from "@/import-graph/languages/typescript"
import { readRepositorySnapshot } from "@/import-graph/repository-snapshot"

const readerOf = async (files: FakeFiles): Promise<ImportReader> => {
  const gitAdapter = createFakeGitAdapter({ base: {}, head: files })
  return typescriptImportLanguage.createImportReader(await readRepositorySnapshot(gitAdapter, HEAD_COMMIT))
}

const config = (compilerOptions: Record<string, unknown>, more: Record<string, unknown> = {}): string =>
  JSON.stringify({ ...more, compilerOptions })

const importing = (...specifiers: string[]): string =>
  specifiers.map((specifier) => `import "${specifier}"`).join("\n")

describe("the TypeScript import language", () => {
  it("covers TypeScript, JavaScript and Vue files", () => {
    expect(typescriptImportLanguage.extensions).toStrictEqual([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".vue"])
  })

  describe("importsOf", () => {
    it.each([
      ["a file in the same folder", "./pricing", "src/pricing.ts"],
      ["a file in a parent folder", "../shared/money", "shared/money.ts"],
      ["a TSX file", "./Button", "src/Button.tsx"],
      ["a JavaScript file", "./legacy", "src/legacy.js"],
      ["a declaration file", "./ambient", "src/ambient.d.ts"],
      ["a file with its extension written out", "./pricing.ts", "src/pricing.ts"],
      ["a TypeScript file through the extension it is emitted with", "./pricing.js", "src/pricing.ts"],
      ["a TSX file through the extension it is emitted with", "./Button.jsx", "src/Button.tsx"],
      ["an ES module file through the extension it is emitted with", "./worker.mjs", "src/worker.mts"],
      ["a Vue file", "./Checkout.vue", "src/Checkout.vue"],
      ["the index file of a folder", "./orders", "src/orders/index.ts"],
      ["the index file of a folder written with a slash", "./orders/", "src/orders/index.ts"],
      ["the index file of the current folder", ".", "src/index.ts"],
      ["the index file of the parent folder", "..", "index.ts"],
    ])("resolves %s", async (_target, specifier, resolved) => {
      const reader = await readerOf({
        "src/app.ts": importing(specifier),
        "src/pricing.ts": "",
        "src/Button.tsx": "",
        "src/legacy.js": "",
        "src/ambient.d.ts": "",
        "src/worker.mts": "",
        "src/Checkout.vue": "",
        "src/orders/index.ts": "",
        "src/index.ts": "",
        "shared/money.ts": "",
        "index.ts": "",
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual([resolved])
    })

    it("resolves a path alias of the nearest tsconfig", async () => {
      const reader = await readerOf({
        "tsconfig.json": config({ paths: { "@/*": ["./src/*"], "@config": ["./src/settings/index.ts"] } }),
        "src/app/checkout.ts": importing("@/pricing", "@config"),
        "src/pricing.ts": "",
        "src/settings/index.ts": "",
      })

      expect(await reader.importsOf("src/app/checkout.ts")).toStrictEqual(["src/pricing.ts", "src/settings/index.ts"])
    })

    it("resolves a path alias against the base URL", async () => {
      const reader = await readerOf({
        "tsconfig.json": config({ baseUrl: "src", paths: { "~lib/*": ["lib/*"] } }),
        "src/app.ts": importing("~lib/pricing", "lib/money"),
        "src/lib/pricing.ts": "",
        "src/lib/money.ts": "",
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual(["src/lib/money.ts", "src/lib/pricing.ts"])
    })

    it("resolves a path alias a tsconfig takes from the config it extends", async () => {
      const reader = await readerOf({
        "tsconfig.base.json": config({ paths: { "@shared/*": ["./shared/*"] } }),
        "apps/shop/tsconfig.json": config({}, { extends: "../../tsconfig.base.json" }),
        "apps/shop/src/app.ts": importing("@shared/money"),
        "shared/money.ts": "",
      })

      expect(await reader.importsOf("apps/shop/src/app.ts")).toStrictEqual(["shared/money.ts"])
    })

    it("resolves each file through the tsconfig of its own project", async () => {
      const reader = await readerOf({
        "apps/shop/tsconfig.json": config({ paths: { "@/*": ["./src/*"] } }),
        "apps/shop/src/app.ts": importing("@/pricing"),
        "apps/shop/src/pricing.ts": "",
        "apps/admin/tsconfig.json": config({ paths: { "@/*": ["./src/*"] } }),
        "apps/admin/src/app.ts": importing("@/pricing"),
        "apps/admin/src/pricing.ts": "",
      })

      expect(await reader.importsOf("apps/shop/src/app.ts")).toStrictEqual(["apps/shop/src/pricing.ts"])
      expect(await reader.importsOf("apps/admin/src/app.ts")).toStrictEqual(["apps/admin/src/pricing.ts"])
    })

    it("resolves a package of the workspace by its name", async () => {
      const reader = await readerOf({
        "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", main: "./src/index.ts" }),
        "packages/ui/src/index.ts": "",
        "packages/ui/src/button.tsx": "",
        "apps/shop/src/app.ts": importing("@acme/ui", "@acme/ui/src/button"),
      })

      expect(await reader.importsOf("apps/shop/src/app.ts")).toStrictEqual(["packages/ui/src/button.tsx", "packages/ui/src/index.ts"])
    })

    it("resolves a package of the workspace that names no entry file", async () => {
      const reader = await readerOf({
        "packages/money/package.json": JSON.stringify({ name: "@acme/money" }),
        "packages/money/src/index.ts": "",
        "apps/shop/src/app.ts": importing("@acme/money"),
      })

      expect(await reader.importsOf("apps/shop/src/app.ts")).toStrictEqual(["packages/money/src/index.ts"])
    })

    it("resolves a package of the workspace through its exports", async () => {
      const reader = await readerOf({
        "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", exports: { ".": { import: "./lib/main.ts" } } }),
        "packages/ui/lib/main.ts": "",
        "apps/shop/src/app.ts": importing("@acme/ui"),
      })

      expect(await reader.importsOf("apps/shop/src/app.ts")).toStrictEqual(["packages/ui/lib/main.ts"])
    })

    it("resolves a folder through the entry file its package.json names", async () => {
      const reader = await readerOf({
        "vendor/charts/package.json": JSON.stringify({ main: "./lib/main.js" }),
        "vendor/charts/lib/main.js": "",
        "src/app.ts": importing("../vendor/charts"),
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual(["vendor/charts/lib/main.js"])
    })

    it("leaves out packages that are not in the repository", async () => {
      const reader = await readerOf({ "src/app.ts": importing("react", "node:fs", "@scope/absent", "./missing") })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual([])
    })

    it("leaves out files that are not code of the language", async () => {
      const reader = await readerOf({
        "src/app.ts": importing("./data.json", "./app.css", "./pricing"),
        "src/data.json": "{}",
        "src/app.css": "",
        "src/pricing.ts": "",
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual(["src/pricing.ts"])
    })

    it("lists a file once, however many times and ways it is imported", async () => {
      const reader = await readerOf({
        "src/app.ts": [
          "import { priceOf } from \"./pricing\"",
          "import type { Price } from \"./pricing.js\"",
          "export * from \"./pricing\"",
          "const pricing = require(\"./pricing\")",
        ].join("\n"),
        "src/pricing.ts": "",
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual(["src/pricing.ts"])
    })

    it("leaves out a file's import of itself", async () => {
      const reader = await readerOf({ "src/app.ts": importing("./app") })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual([])
    })

    it("leaves out what a file loads with a dynamic import", async () => {
      const reader = await readerOf({
        "src/app.ts": "const pricing = await import(\"./pricing\")",
        "src/pricing.ts": "",
      })

      expect(await reader.importsOf("src/app.ts")).toStrictEqual([])
    })

    it("resolves the imports of a Vue file", async () => {
      const reader = await readerOf({
        "src/Checkout.vue": "<script setup lang=\"ts\">\nimport Button from \"./Button.vue\"\nimport { priceOf } from \"./pricing\"\n</script>",
        "src/Button.vue": "",
        "src/pricing.ts": "",
      })

      expect(await reader.importsOf("src/Checkout.vue")).toStrictEqual(["src/Button.vue", "src/pricing.ts"])
    })

    it("has no imports for a file that is not in the commit", async () => {
      const reader = await readerOf({ "src/app.ts": "" })

      expect(await reader.importsOf("src/absent.ts")).toStrictEqual([])
    })
  })

  describe("importerPatternsOf", () => {
    it("searches for the name of the package that holds the file", async () => {
      const reader = await readerOf({
        "package.json": JSON.stringify({ name: "storefront" }),
        "packages/ui/package.json": JSON.stringify({ name: "@acme/ui" }),
        "packages/ui/src/button.tsx": "",
      })

      const patterns = await reader.importerPatternsOf("packages/ui/src/button.tsx")

      expect(patterns.some((pattern) => new RegExp(pattern).test("import { Button } from \"@acme/ui\""))).toBe(true)
      expect(patterns.some((pattern) => new RegExp(pattern).test("import { Button } from \"storefront\""))).toBe(false)
    })

    it("searches for the path aliases of every tsconfig and jsconfig that point at the file", async () => {
      const reader = await readerOf({
        "tsconfig.base.json": config({ paths: { "@orders": ["./src/orders/place-order.ts"], "@/*": ["./src/*"] } }),
        "apps/admin/jsconfig.json": config({ paths: { "~place": ["../../src/orders/place-order"] } }),
        "src/orders/place-order.ts": "",
      })

      const patterns = await reader.importerPatternsOf("src/orders/place-order.ts")
      const isSearchedFor = (source: string): boolean => patterns.some((pattern) => new RegExp(pattern).test(source))

      expect(isSearchedFor("import { placeOrder } from \"@orders\"")).toBe(true)
      expect(isSearchedFor("import { placeOrder } from \"~place\"")).toBe(true)
      expect(isSearchedFor("import { placeOrder } from \"@/\"")).toBe(false)
    })

    it("searches without a package or an alias for a file that has neither", async () => {
      const reader = await readerOf({ "src/pricing.ts": "" })

      expect(await reader.importerPatternsOf("src/pricing.ts")).toHaveLength(1)
    })
  })
})
