import assert from "node:assert/strict"
import { describe, it } from "vitest"
import { withoutTrailingSlashes } from "@/git-adapter/helpers/trailing-slashes"

const LONG_RUN = 100_000

describe("removing the slashes at the end of a URL", () => {
  it("removes every slash at the end and keeps the ones inside", () => {
    assert.strictEqual(withoutTrailingSlashes("https://git.example.com/api/v4///"), "https://git.example.com/api/v4")
    assert.strictEqual(withoutTrailingSlashes("https://git.example.com"), "https://git.example.com")
  })

  it("leaves nothing of a text made only of slashes", () => {
    assert.strictEqual(withoutTrailingSlashes("///"), "")
    assert.strictEqual(withoutTrailingSlashes(""), "")
  })

  it("stays quick on a long run of slashes, wherever it is", () => {
    assert.strictEqual(withoutTrailingSlashes(`${"/".repeat(LONG_RUN)}x`), `${"/".repeat(LONG_RUN)}x`)
    assert.strictEqual(withoutTrailingSlashes(`x${"/".repeat(LONG_RUN)}`), "x")
  })
})
