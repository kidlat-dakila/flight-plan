import * as assert from "assert"
import { Filters, Pins } from "../listState"
import type { TargetRef } from "../../../lib/git-adapter/types"

/*
 * The store, against a fake Memento.
 *
 * `pins.ts` imports vscode as a type only, so this runs under the plain test
 * runner rather than needing an extension host: the storage is a Memento's
 * two methods and nothing more.
 */
suite("remembering pins", () => {
  const memento = () => {
    const state = new Map<string, unknown>()
    return {
      keys: () => [...state.keys()],
      get: <T>(key: string) => state.get(key) as T,
      update: async (key: string, value: unknown) => {
        if (value === undefined) state.delete(key)
        else state.set(key, value)
      },
      seen: state,
    }
  }

  const pr = (number: number): TargetRef => ({ kind: "pr", number })
  const branch = (name: string): TargetRef => ({ kind: "branch", name })

  test("keeps a pin, and keeps it sorted", async () => {
    const pins = new Pins(memento())
    await pins.add("acme/storefront", pr(12))
    await pins.add("acme/storefront", pr(3))
    assert.deepStrictEqual(pins.list("acme/storefront"), [pr(3), pr(12)])
  })

  test("pinning twice is pinning once", async () => {
    const pins = new Pins(memento())
    await pins.add("acme/storefront", pr(7))
    await pins.add("acme/storefront", pr(7))
    assert.deepStrictEqual(pins.list("acme/storefront"), [pr(7)])
  })

  /*
   * A branch is not a pull request, and the store has to keep them apart. The
   * case that proves it: branch `7` and pull request 7 are different things
   * that would collide under any scheme keyed on a bare number.
   */
  test("a branch and a pull request of the same name are different pins", async () => {
    const pins = new Pins(memento())
    await pins.add("acme/storefront", pr(7))
    await pins.add("acme/storefront", branch("7"))
    assert.deepStrictEqual(pins.list("acme/storefront"), [pr(7), branch("7")])

    await pins.remove("acme/storefront", branch("7"))
    assert.deepStrictEqual(pins.list("acme/storefront"), [pr(7)])
  })

  test("branches are kept in a stable order beside pull requests", async () => {
    const pins = new Pins(memento())
    await pins.add("acme/storefront", branch("stock-check"))
    await pins.add("acme/storefront", pr(4))
    await pins.add("acme/storefront", branch("audit"))
    assert.deepStrictEqual(pins.list("acme/storefront"), [
      pr(4),
      branch("audit"),
      branch("stock-check"),
    ])
  })

  test("two repositories keep their own", async () => {
    // The number is the whole identity, so a pin that leaked across
    // repositories would point at a different pull request.
    const pins = new Pins(memento())
    await pins.add("acme/storefront", pr(5))
    await pins.add("acme/api", pr(9))
    assert.deepStrictEqual(pins.list("acme/storefront"), [pr(5)])
    assert.deepStrictEqual(pins.list("acme/api"), [pr(9)])
  })

  test("the same repository in different case is the same repository", async () => {
    const pins = new Pins(memento())
    await pins.add("acme/storefront", pr(5))
    assert.deepStrictEqual(pins.list("ACME/Storefront"), [pr(5)])
  })

  test("unpinning the last one leaves nothing behind", async () => {
    const store = memento()
    const pins = new Pins(store)
    await pins.add("acme/storefront", pr(5))
    await pins.remove("acme/storefront", pr(5))
    assert.deepStrictEqual(pins.list("acme/storefront"), [])
    assert.deepStrictEqual([...store.seen.keys()], [])
  })

  /*
   * Pins written before branches existed were bare numbers. Refusing them would
   * silently empty the pin list of everybody who had one, on an upgrade, with
   * nothing anywhere to say why.
   */
  test("pins stored as bare numbers by an older version still read", async () => {
    const store = memento()
    await store.update("flightPlan.pins.acme/storefront", [12, 3])
    assert.deepStrictEqual(new Pins(store).list("acme/storefront"), [pr(3), pr(12)])
  })

  test("survives state that is not a list of refs", async () => {
    // Written by a later version, or by hand. Bad state should cost the pins,
    // not the panel.
    const store = memento()
    await store.update("flightPlan.pins.acme/storefront", [
      "pr-3",
      "sticker-9",
      null,
      -1,
      0,
      "branch-",
    ])
    assert.deepStrictEqual(new Pins(store).list("acme/storefront"), [pr(3)])
    await store.update("flightPlan.pins.acme/api", "nonsense")
    assert.deepStrictEqual(new Pins(store).list("acme/api"), [])
  })

  test("no repository means no pins, rather than a shared bucket", async () => {
    assert.deepStrictEqual(new Pins(memento()).list(""), [])
  })
})

/*
 * The filter, which is workspace state for the same reason the pins are: it is
 * a working note about this week's review queue, not a preference, and it has
 * no business in a settings file somebody might commit.
 */
suite("remembering the filter", () => {
  const memento = () => {
    const state = new Map<string, unknown>()
    return {
      keys: () => [...state.keys()],
      get: <T>(key: string) => state.get(key) as T,
      update: async (key: string, value: unknown) => {
        state.set(key, value)
      },
      seen: state,
    }
  }

  test("starts on the pull requests awaiting your review", () => {
    // What the panel showed before any of this was configurable.
    const filters = new Filters(memento())
    assert.deepStrictEqual(filters.filter(), {
      review: ["awaiting-me-or-team"],
      labels: [],
    })
    assert.strictEqual(filters.includeMine(), true)
  })

  test("keeps what was picked", async () => {
    const filters = new Filters(memento())
    await filters.setReview(["approved", "changes-requested"])
    await filters.setLabels(["needs-review"])
    await filters.setIncludeMine(false)
    assert.deepStrictEqual(filters.filter(), {
      review: ["approved", "changes-requested"],
      labels: ["needs-review"],
    })
    assert.strictEqual(filters.includeMine(), false)
  })

  test("an empty review list means any review state, and is not the default", async () => {
    // The difference matters: "nothing stored yet" is the review queue, and
    // "stored, empty" is somebody deliberately asking for all of them.
    const filters = new Filters(memento())
    await filters.setReview([])
    assert.deepStrictEqual(filters.filter().review, [])
  })

  /*
   * Review filters belong to the adapter and do not translate between hosts, so
   * there is no fixed set to validate against any more. An unknown key is kept
   * and ignored by whichever adapter is in use — which is what makes switching
   * hosts survivable: the GitHub default stops applying on GitLab rather than
   * filtering the list down to nothing.
   */
  test("keeps a review key this adapter does not know, for one that might", async () => {
    const store = memento()
    await store.update("flightPlan.filter.review", ["approved", "from-the-future", 7])
    // The number goes, because it was never a key. The unknown string stays.
    assert.deepStrictEqual(new Filters(store).filter().review, [
      "approved",
      "from-the-future",
    ])
  })

  test("survives state that is not a list", async () => {
    const store = memento()
    await store.update("flightPlan.filter.labels", "needs-review")
    assert.deepStrictEqual(new Filters(store).filter().labels, [])
    await store.update("flightPlan.filter.includeMine", "yes")
    assert.strictEqual(new Filters(store).includeMine(), true)
  })
})
