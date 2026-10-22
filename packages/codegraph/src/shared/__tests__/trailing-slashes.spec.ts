import { withoutTrailingSlashes } from "@/shared/trailing-slashes"

const LONG_RUN = 100_000

describe("withoutTrailingSlashes", () => {
  it("removes every slash at the end and keeps the ones inside", () => {
    expect(withoutTrailingSlashes("src/api//")).toBe("src/api")
    expect(withoutTrailingSlashes("src")).toBe("src")
    expect(withoutTrailingSlashes("///")).toBe("")
  })

  it("stays quick on a long run of slashes, wherever it is", () => {
    expect(withoutTrailingSlashes(`${"/".repeat(LONG_RUN)}x`)).toBe(`${"/".repeat(LONG_RUN)}x`)
    expect(withoutTrailingSlashes(`x${"/".repeat(LONG_RUN)}`)).toBe("x")
  })
})
