import { isIgnoredBy, isIgnoredFile, listIgnoredGlobs } from "@/code-blocks/ignored-files"

describe("isIgnoredFile", () => {
  it("ignores a test, a spec and a story by the name of the file", () => {
    expect(["src/cart.test.ts", "src/cart.spec.tsx", "src/Button.stories.tsx"].map(isIgnoredFile)).toStrictEqual([true, true, true])
  })

  it("ignores every file of a __tests__ folder", () => {
    expect(["__tests__/cart.ts", "src/cart/__tests__/fixture.ts"].map(isIgnoredFile)).toStrictEqual([true, true])
  })

  it("keeps a file that only has such a word in its name", () => {
    expect(["src/test-utils.ts", "src/spec.ts", "src/stories/index.ts", "src/contest.ts"].map(isIgnoredFile)).toStrictEqual([false, false, false, false])
  })

  it("ignores a Python test by the name of the file", () => {
    expect(["tests/test_orders.py", "orders/orders_test.py", "tests/conftest.py", "orders/latest.py"].map(isIgnoredFile)).toStrictEqual([true, true, true, false])
  })

  it("reads which files are ignored from the file patterns of the catalogue that say so", () => {
    const globs = listIgnoredGlobs([
      {
        name: "Repository",
        specifiers: [],
        category: "testing",
        type: "fullstack",
        language: "javascript",
        patterns: [
          { kind: "file", glob: "e2e/**", exports: [], isIgnored: true },
          { kind: "file", glob: "pages/**", exports: [{ name: "default", runs: "page" }] },
        ],
      },
    ])

    expect(globs).toStrictEqual(["e2e/**"])
    expect(["e2e/cart.ts", "pages/cart.ts"].map((filePath) => isIgnoredBy(globs, filePath))).toStrictEqual([true, false])
  })
})
