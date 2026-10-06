import { applyDiffs, DiffMismatchError, UnreadableDiffError, type RepositoryFiles } from "@/apply-diffs"

const BASE_FILES: RepositoryFiles = new Map([
  ["src/price.ts", "const CENTS = 100\nexport const priceOf = (amount: number) => amount / CENTS\n"],
  ["src/cart.ts", "export const cart = []\n"],
])

const diffOf = (...lines: readonly string[]): string => lines.join("\n")

const PRICE_DIFF = diffOf(
  "diff --git a/src/price.ts b/src/price.ts",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  "@@ -2 +2 @@",
  "-export const priceOf = (amount: number) => amount / CENTS",
  "+export const priceOf = (amount: number) => Math.round(amount) / CENTS",
)

describe("applyDiffs", () => {
  it("returns the base files when there is no diff", () => {
    expect(applyDiffs(BASE_FILES, [])).toStrictEqual(BASE_FILES)
  })

  it("changes the lines a diff names and leaves the other files alone", () => {
    const headFiles = applyDiffs(BASE_FILES, [PRICE_DIFF])

    expect(headFiles.get("src/price.ts")).toBe(
      "const CENTS = 100\nexport const priceOf = (amount: number) => Math.round(amount) / CENTS\n",
    )
    expect(headFiles.get("src/cart.ts")).toBe("export const cart = []\n")
  })

  it("leaves the base files untouched", () => {
    applyDiffs(BASE_FILES, [PRICE_DIFF])

    expect(BASE_FILES.get("src/price.ts")).toContain("amount / CENTS")
  })

  it("adds a file the diff creates", () => {
    const created = diffOf(
      "diff --git a/src/tax.ts b/src/tax.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/tax.ts",
      "@@ -0,0 +1 @@",
      "+export const TAX_RATE = 0.2",
    )

    expect(applyDiffs(BASE_FILES, [created]).get("src/tax.ts")).toBe("export const TAX_RATE = 0.2\n")
  })

  it("drops a file the diff deletes", () => {
    const deleted = diffOf(
      "diff --git a/src/cart.ts b/src/cart.ts",
      "deleted file mode 100644",
      "--- a/src/cart.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-export const cart = []",
    )

    expect([...applyDiffs(BASE_FILES, [deleted]).keys()]).toStrictEqual(["src/price.ts"])
  })

  it("moves a file the diff renames", () => {
    const renamed = diffOf(
      "diff --git a/src/cart.ts b/src/basket.ts",
      "similarity index 100%",
      "rename from src/cart.ts",
      "rename to src/basket.ts",
    )

    const headFiles = applyDiffs(BASE_FILES, [renamed])

    expect(headFiles.get("src/basket.ts")).toBe("export const cart = []\n")
    expect(headFiles.has("src/cart.ts")).toBe(false)
  })

  it("applies several diffs in order", () => {
    const second = diffOf(
      "diff --git a/src/price.ts b/src/price.ts",
      "--- a/src/price.ts",
      "+++ b/src/price.ts",
      "@@ -1 +1 @@",
      "-const CENTS = 100",
      "+const CENTS = 1000",
    )

    expect(applyDiffs(BASE_FILES, [PRICE_DIFF, second]).get("src/price.ts")).toBe(
      "const CENTS = 1000\nexport const priceOf = (amount: number) => Math.round(amount) / CENTS\n",
    )
  })

  it("rejects a diff whose removed line is not in the file", () => {
    const stale = diffOf(
      "diff --git a/src/price.ts b/src/price.ts",
      "--- a/src/price.ts",
      "+++ b/src/price.ts",
      "@@ -2 +2 @@",
      "-export const priceOf = () => 0",
      "+export const priceOf = () => 1",
    )

    expect(() => applyDiffs(BASE_FILES, [stale])).toThrow(DiffMismatchError)
  })

  it("rejects a diff without a file header", () => {
    const headless = diffOf("--- a/src/price.ts", "+++ b/src/price.ts", "@@ -1 +1 @@", "-const CENTS = 100", "+const CENTS = 1")

    expect(() => applyDiffs(BASE_FILES, [headless])).toThrow(UnreadableDiffError)
  })
})
