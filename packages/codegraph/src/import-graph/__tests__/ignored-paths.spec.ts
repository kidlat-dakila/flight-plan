import { isIgnoredPath, withoutIgnoredPaths } from "@/import-graph/ignored-paths"
import type { ImportGraphContext, ImportTracer } from "@/import-graph/import-graph-context"
import { typescriptImportLanguage } from "@/import-graph/languages/typescript"

describe("isIgnoredPath", () => {
  it.each([
    ["**/*.test.ts", "src/cart/price.test.ts"],
    ["**/*.test.tsx", "src/Cart.test.tsx"],
    ["**/*.spec.ts", "price.spec.ts"],
    ["**/*.spec.tsx", "apps/web/src/Cart.spec.tsx"],
    ["**/__tests__/**", "src/cart/__tests__/fixture.ts"],
    ["**/e2e/**", "apps/web/e2e/checkout.ts"],
    ["**/*.e2e.ts", "tests-e2e/checkout.e2e.ts"],
    ["**/*.e2e-spec.ts", "src/app.e2e-spec.ts"],
    ["**/test_*.py", "orders/test_models.py"],
    ["**/*_test.py", "orders/models_test.py"],
    ["**/tests/**", "orders/tests/factories.py"],
    ["**/conftest.py", "conftest.py"],
  ])("ignores what %s matches, such as %s", (pattern, path) => {
    expect(isIgnoredPath([pattern], path)).toBe(true)
  })

  it("keeps a file no pattern matches", () => {
    expect(isIgnoredPath(["**/*.test.ts", "**/tests/**"], "src/testing/price.ts")).toBe(false)
  })

  it("matches a pattern with no slash at any depth, as .gitignore does", () => {
    expect(isIgnoredPath(["*.md"], "docs/guide/setup.md")).toBe(true)
  })

  it("reads a pattern with a slash from the root of the repository", () => {
    expect(isIgnoredPath(["src/generated/*.ts"], "src/generated/client.ts")).toBe(true)
    expect(isIgnoredPath(["src/generated/*.ts"], "packages/api/src/generated/client.ts")).toBe(false)
  })

  it("ignores every file below a folder a pattern matches", () => {
    expect(isIgnoredPath(["fixtures"], "src/fixtures/orders/big.json")).toBe(true)
    expect(isIgnoredPath(["src/legacy"], "src/legacy/cart/price.ts")).toBe(true)
  })

  it("matches only folders with a pattern that ends in a slash", () => {
    expect(isIgnoredPath(["snapshots/"], "src/snapshots/cart.snap")).toBe(true)
    expect(isIgnoredPath(["snapshots/"], "src/snapshots")).toBe(false)
  })

  it("keeps a file a later pattern starting with ! matches again", () => {
    expect(isIgnoredPath(["**/tests/**", "!**/tests/helpers.py"], "orders/tests/helpers.py")).toBe(false)
    expect(isIgnoredPath(["!**/tests/helpers.py", "**/tests/**"], "orders/tests/helpers.py")).toBe(true)
  })

  it("ignores nothing with no patterns", () => {
    expect(isIgnoredPath([], "src/price.test.ts")).toBe(false)
  })
})

const CONTEXT: ImportGraphContext = {
  baseCommit: "base",
  headCommit: "head",
  diffTypes: new Map([["src/price.ts", "modified"], ["src/price.test.ts", "added"]]),
  patches: new Map([["src/price.ts", "@@ price"], ["src/price.test.ts", "@@ test"]]),
  tracerFor: async () => await Promise.reject(new Error("not traced")),
}

describe("withoutIgnoredPaths", () => {
  it("drops the ignored files from the changed files and their patches", () => {
    const kept = withoutIgnoredPaths(CONTEXT, ["**/*.test.ts"])

    expect([...kept.diffTypes.keys()]).toStrictEqual(["src/price.ts"])
    expect([...kept.patches.keys()]).toStrictEqual(["src/price.ts"])
  })

  it("never reaches an ignored file as an importer, and still follows the imports of a kept file into one", async () => {
    const tracer: ImportTracer = {
      commit: "head",
      files: new Set(["src/price.ts", "src/price.test.ts", "src/cart.ts", "src/fixtures/rates.ts"]),
      importersOf: async () => await Promise.resolve([["src/price.test.ts", "src/cart.ts"]]),
      importsOf: async () => await Promise.resolve([["src/fixtures/rates.ts"]]),
      importedFilePathsOf: async () => await Promise.resolve([]),
    }
    const context: ImportGraphContext = { ...CONTEXT, tracerFor: async () => await Promise.resolve(tracer) }

    const kept = await withoutIgnoredPaths(context, ["**/*.test.ts", "fixtures"]).tracerFor("head", typescriptImportLanguage)

    expect(await kept.importersOf(["src/price.ts"])).toStrictEqual([["src/cart.ts"]])
    expect(await kept.importsOf(["src/price.ts"])).toStrictEqual([["src/fixtures/rates.ts"]])
  })
})
