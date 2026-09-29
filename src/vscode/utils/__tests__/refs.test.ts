import * as assert from "assert"
import { parseBranchName, parsePullRequestRef } from "../refs"

/*
 * What somebody actually pastes.
 *
 * A pull request link arrives from the browser with a tab on the end of it, or
 * from a comment as `owner/repo#123`, or from a colleague as a bare number. The
 * parser is the whole of the feature that can be wrong quietly: every other
 * part of pinning fails loudly.
 */
suite("reading a pasted pull request", () => {
  const here = "acme/storefront"

  test("a plain link", () => {
    assert.deepStrictEqual(
      parsePullRequestRef("https://github.com/acme/storefront/pull/123", here),
      { ok: true, number: 123 },
    )
  })

  test("a link with the tab still on it", () => {
    // What the Files changed tab gives you, which is where a reviewer is
    // standing when they decide they want the walkthrough.
    for (const suffix of ["/files", "/commits", "/checks", "/files#diff-abc123"]) {
      assert.deepStrictEqual(
        parsePullRequestRef(`https://github.com/acme/storefront/pull/123${suffix}`, here),
        { ok: true, number: 123 },
        suffix,
      )
    }
  })

  test("a link with a comment anchor or a query on it", () => {
    assert.deepStrictEqual(
      parsePullRequestRef(
        "https://github.com/acme/storefront/pull/123?w=1#issuecomment-99",
        here,
      ),
      { ok: true, number: 123 },
    )
  })

  test("surrounding whitespace, which a paste often carries", () => {
    assert.deepStrictEqual(
      parsePullRequestRef("  https://github.com/acme/storefront/pull/123  ", here),
      { ok: true, number: 123 },
    )
  })

  test("the shorthand GitHub itself writes", () => {
    assert.deepStrictEqual(parsePullRequestRef("acme/storefront#123", here), {
      ok: true,
      number: 123,
    })
  })

  test("a bare number, with or without the hash", () => {
    assert.deepStrictEqual(parsePullRequestRef("#123", here), { ok: true, number: 123 })
    assert.deepStrictEqual(parsePullRequestRef("123", here), { ok: true, number: 123 })
  })

  test("the repository is compared without regard to case", () => {
    // GitHub treats owner and name case-insensitively, so refusing `Acme` when
    // the remote says `acme` would be refusing the same repository.
    assert.deepStrictEqual(
      parsePullRequestRef("https://github.com/ACME/Storefront/pull/7", here),
      { ok: true, number: 7 },
    )
  })

  test("another repository is refused, and named", () => {
    const result = parsePullRequestRef(
      "https://github.com/acme/other-service/pull/9",
      here,
    )
    assert.strictEqual(result.ok, false)
    assert.ok(
      result.ok === false && result.reason.includes("acme/other-service"),
      result.ok === false ? result.reason : "",
    )
  })

  test("an issue link is refused, because it is not a pull request", () => {
    assert.strictEqual(
      parsePullRequestRef("https://github.com/acme/storefront/issues/123", here).ok,
      false,
    )
  })

  test("another host is refused", () => {
    assert.strictEqual(
      parsePullRequestRef("https://github.example.com/acme/storefront/pull/1", here).ok,
      false,
    )
  })

  test("nonsense is refused rather than guessed at", () => {
    for (const text of ["", "   ", "pull/123", "acme/storefront", "#0", "-4", "12abc"]) {
      assert.strictEqual(parsePullRequestRef(text, here).ok, false, JSON.stringify(text))
    }
  })

  test("a number is refused when the repository is not known yet", () => {
    // Nothing to compare against, and pinning into the wrong list is worse than
    // asking again once the repository has been worked out.
    assert.strictEqual(parsePullRequestRef("123", "").ok, false)
  })
})

/**
 * A branch name is checked before it is looked for.
 *
 * Otherwise a typo becomes "that branch is not in this checkout", which reads
 * as a fetch problem and sends the reader to pull something that was never
 * there.
 */
suite("reading a typed branch name", () => {
  test("an ordinary name is accepted, and trimmed", () => {
    assert.deepStrictEqual(parseBranchName("  stock-check  "), {
      ok: true,
      name: "stock-check",
    })
    assert.deepStrictEqual(parseBranchName("feature/checkout-v2"), {
      ok: true,
      name: "feature/checkout-v2",
    })
  })

  test("git's own reserved shapes are refused", () => {
    for (const bad of [
      "",
      "   ",
      "two words",
      "a..b",
      "/leading",
      "trailing/",
      "-leading",
      "thing.lock",
      "a~b",
      "a^b",
      "a:b",
      "a?b",
      "a*b",
      "a[b",
    ]) {
      const parsed = parseBranchName(bad)
      assert.strictEqual(parsed.ok, false, `${JSON.stringify(bad)} should be refused`)
    }
  })
})
