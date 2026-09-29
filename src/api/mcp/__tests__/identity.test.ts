import * as assert from "node:assert/strict"
import { suite, test } from "vitest"
import { planIdOf, planTargetOf, type PlanTarget } from "../identity"

/**
 * The reference that names a flight plan.
 *
 * It is written down rather than opaque so an agent resuming work it did not
 * start can name the document without a lookup, which means the form itself is
 * a contract: round-tripping is the property, and every malformed shape has to
 * refuse rather than resolve to something.
 */

const round = (target: PlanTarget): PlanTarget => planTargetOf(planIdOf(target))

suite("a flight plan reference", () => {
  test("round-trips a pull request", () => {
    const target: PlanTarget = {
      kind: "review",
      repo: "acme/storefront",
      key: { kind: "pr", number: 412 },
    }
    assert.strictEqual(planIdOf(target), "review:acme/storefront#412")
    assert.deepStrictEqual(round(target), target)
  })

  test("round-trips a branch that contains slashes", () => {
    const target: PlanTarget = {
      kind: "review",
      repo: "acme/storefront",
      key: { kind: "branch", name: "release/4.2" },
    }
    assert.strictEqual(planIdOf(target), "review:acme/storefront@release/4.2")
    assert.deepStrictEqual(round(target), target)
  })

  test("round-trips a plan", () => {
    const target: PlanTarget = {
      kind: "create",
      repo: "acme/storefront",
      name: "add-levels",
    }
    assert.strictEqual(planIdOf(target), "create:acme/storefront@add-levels")
    assert.deepStrictEqual(round(target), target)
  })

  test("keeps a nested group's whole path", () => {
    const target: PlanTarget = {
      kind: "review",
      repo: "group/subgroup/project",
      key: { kind: "pr", number: 7 },
    }
    assert.deepStrictEqual(round(target), target)
  })

  test("reads a branch that contains the other separator", () => {
    // A repository can hold neither `#` nor `@`, so the first one always ends
    // it — whatever the branch after it turns out to contain.
    const target: PlanTarget = {
      kind: "review",
      repo: "acme/storefront",
      key: { kind: "branch", name: "fix/issue#31" },
    }
    assert.deepStrictEqual(round(target), target)
  })
})

suite("a reference that names nothing", () => {
  test("refuses a string with no kind", () => {
    assert.throws(() => planTargetOf("acme/storefront#1"), /not a flight plan reference/)
  })

  test("refuses a kind that is not one of the two", () => {
    assert.throws(() => planTargetOf("wiki:acme/storefront@src/a.ts"), /not a kind of flight plan/)
  })

  test("refuses a repository and nothing else", () => {
    assert.throws(() => planTargetOf("review:acme/storefront"), /names a repository and nothing else/)
  })

  test("refuses a separator with nothing after it", () => {
    assert.throws(() => planTargetOf("review:acme/storefront#"), /names nothing after it/)
  })

  test("refuses something that is not a repository", () => {
    assert.throws(() => planTargetOf("review:storefront#1"), /is not a repository/)
  })

  test("refuses a numbered plan, and says which separator a plan takes", () => {
    assert.throws(() => planTargetOf("create:acme/storefront#7"), /A plan is named, not numbered/)
  })

  test("refuses a plan name that is not one", () => {
    assert.throws(() => planTargetOf("create:acme/storefront@not a name"), /is not a plan name/)
  })

  test("suggests the branch form when a pull request number is not a number", () => {
    assert.throws(
      () => planTargetOf("review:acme/storefront#my-branch"),
      /Use `@` for a branch: review:acme\/storefront@my-branch/,
    )
  })

  test("refuses pull request zero", () => {
    assert.throws(() => planTargetOf("review:acme/storefront#0"), /start at 1/)
  })
})
