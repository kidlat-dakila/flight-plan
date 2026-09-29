import * as assert from "assert"
import * as path from "node:path"
import {
  StorageError,
  fileOfId,
  formatId,
  parseId,
  walkthroughKeyOf,
  walkthroughName,
  type StorageConfig,
} from "../documentId"

suite("mcp/documentId", () => {
  const config: StorageConfig = {
    walkthroughRoot: "/store/walkthroughs",
    planRoot: "/store/plans",
  }

  suite("walkthroughKeyOf", () => {
    test("reads back every name walkthroughName writes", () => {
      for (const key of [
        { kind: "pr", number: 412 },
        { kind: "branch", name: "feature/checkout-v2" },
        { kind: "branch", name: "fix 100% of it" },
      ] as const) {
        assert.deepStrictEqual(walkthroughKeyOf(walkthroughName(key)), key)
      }
    })

    test("refuses a name walkthroughName would not write", () => {
      for (const name of ["pr-0", "pr-01", "branch-", "branch-%zz", "branch-a%2fb", "notes"]) {
        assert.strictEqual(walkthroughKeyOf(name), null, name)
      }
    })
  })

  suite("walkthroughName", () => {
    test("names a pull request by its number", () => {
      assert.strictEqual(walkthroughName({ kind: "pr", number: 412 }), "pr-412")
    })

    test("escapes a branch into one segment", () => {
      assert.strictEqual(
        walkthroughName({ kind: "branch", name: "feature/checkout-v2" }),
        "branch-feature%2Fcheckout-v2",
      )
    })

    test("refuses a number that is not a pull request", () => {
      assert.throws(() => walkthroughName({ kind: "pr", number: 0 }), StorageError)
    })
  })

  suite("formatId and parseId", () => {
    const cases = [
      { kind: "walkthrough", repo: "acme/storefront", name: "pr-412" },
      { kind: "walkthrough", repo: "acme/storefront", name: "branch-feature%2Fx" },
      { kind: "plan", repo: "acme/storefront", name: "sweep-reservations" },
      // A nested GitLab group: unambiguous, because the name is one segment.
      { kind: "walkthrough", repo: "group/sub/project", name: "pr-7" },
      { kind: "plan", repo: "group/sub/project", name: "sweep" },
    ] as const

    for (const id of cases) {
      test(`round-trips ${formatId(id)}`, () => {
        assert.deepStrictEqual(parseId(formatId(id)), id)
      })
    }

    test("formats the kind, the repository and the name", () => {
      assert.strictEqual(
        formatId({ kind: "walkthrough", repo: "acme/storefront", name: "pr-412" }),
        "walkthrough/acme/storefront/pr-412",
      )
    })

    test("refuses what no document could be", () => {
      for (const text of [
        "sample",
        "sample/plan",
        "review/acme/storefront/pr-1",
        "walkthrough/acme/storefront",
        "walkthrough/acme/storefront/412",
        "plan/acme/storefront/two words",
        "wiki/acme/storefront/src/a.ts",
        "plan/acme/storefront/../escape",
        "walkthrough/acme//pr-1",
        "",
      ]) {
        assert.strictEqual(parseId(text), null, text)
      }
    })
  })

  suite("fileOfId", () => {
    test("maps each kind to a JSON file under its own root", () => {
      assert.strictEqual(
        fileOfId(config, { kind: "walkthrough", repo: "acme/storefront", name: "pr-412" }),
        path.join("/store/walkthroughs", "acme", "storefront", "pr-412.json"),
      )
      assert.strictEqual(
        fileOfId(config, { kind: "plan", repo: "acme/storefront", name: "sweep" }),
        path.join("/store/plans", "acme", "storefront", "sweep.json"),
      )
    })

    test("refuses a name the kind does not allow", () => {
      assert.throws(
        () => fileOfId(config, { kind: "walkthrough", repo: "acme/storefront", name: "../pr-1" }),
        StorageError,
      )
      assert.throws(
        () => fileOfId(config, { kind: "plan", repo: "acme/storefront", name: "a/b" }),
        StorageError,
      )
      assert.throws(
        () => fileOfId(config, { kind: "plan", repo: "../acme", name: "a" }),
        StorageError,
      )
    })
  })
})
