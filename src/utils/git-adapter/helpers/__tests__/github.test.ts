import * as assert from "assert"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { asGitAdapterError } from "../../custom-providers/github-cli-forge-adapter"
import { githubSearch, type ReviewFilter } from "../githubShared"

const run = promisify(execFile)

/** A real rejection from `execFile`, rather than a guess at its shape. */
async function failureOf(command: string, args: string[] = []): Promise<unknown> {
  try {
    await run(command, args)
    assert.fail(`${command} was expected to fail`)
  } catch (cause) {
    return cause
  }
}

suite("classifying a `gh` failure", () => {
  test("a missing binary is recognised, and not from its stderr", async () => {
    const cause = await failureOf("flightplan-definitely-not-installed")

    // The reason the first version of this did not work. `stderr` is present
    // and empty, because the process never started and so never wrote to it,
    // which is why looking for "ENOENT" in there always missed.
    const stderr = String((cause as { stderr?: unknown }).stderr ?? "")
    assert.strictEqual(stderr, "")
    assert.ok(!stderr.includes("ENOENT"))
    assert.ok(String(cause).includes("ENOENT"))

    const error = asGitAdapterError(cause)
    assert.strictEqual(error.problem, "no-cli")
    assert.strictEqual(error.message, "The GitHub CLI is not installed here.")
  })

  test("a command that runs and fails keeps its own words", async () => {
    // `false` exits 1 and says nothing, so the fallback has to reach for the
    // error rather than for empty stderr.
    const error = asGitAdapterError(await failureOf("/usr/bin/false"))
    assert.strictEqual(error.problem, "unknown")
    assert.notStrictEqual(error.message, "")
  })

  test("being signed out is told apart from being absent", () => {
    const error = asGitAdapterError(
      Object.assign(new Error("exited with code 1"), {
        code: 1,
        stderr: "gh: To use GitHub CLI in a GitHub Actions workflow, ... not logged in",
      }),
    )
    assert.strictEqual(error.problem, "auth")
  })

  test("a directory with no GitHub remote is its own case", () => {
    const error = asGitAdapterError(
      Object.assign(new Error("exited with code 1"), {
        code: 1,
        stderr: "fatal: not a git repository (or any of the parent directories): .git",
      }),
    )
    assert.strictEqual(error.problem, "no-repo")
  })
})

/*
 * The search a filter turns into.
 *
 * Pure, and tested rather than eyeballed, because a wrong qualifier does not
 * fail: it returns a plausible list of the wrong pull requests, which is the
 * one kind of wrong a reader cannot see.
 */
suite("building the pull request search", () => {
  test("no filter at all asks for nothing in particular", () => {
    // `gh pr list` is already scoped to open pull requests in this repository,
    // so the widest honest question is no qualifier.
    assert.deepStrictEqual(githubSearch({ review: [], labels: [] }), [])
  })

  test("each review option is the qualifier GitHub documents", () => {
    const expected: [ReviewFilter, string][] = [
      ["none", "review:none"],
      ["required", "review:required"],
      ["approved", "review:approved"],
      ["changes-requested", "review:changes_requested"],
      ["reviewed-by-me", "reviewed-by:@me"],
      ["not-reviewed-by-me", "-reviewed-by:@me"],
      ["awaiting-me", "user-review-requested:@me"],
      ["awaiting-me-or-team", "review-requested:@me"],
    ]
    for (const [key, qualifier] of expected) {
      assert.deepStrictEqual(
        githubSearch({ review: [key], labels: [] }),
        [qualifier],
        key,
      )
    }
  })

  test("several review options combine, in a fixed order", () => {
    // The order is the list's, not the order they were clicked in, so the same
    // filter is always the same search and a cache or a log can be compared.
    assert.deepStrictEqual(
      githubSearch({ review: ["awaiting-me", "required"], labels: [] }),
      ["review:required", "user-review-requested:@me"],
    )
  })

  test("adds one qualifier per label, since GitHub ands them", () => {
    assert.deepStrictEqual(
      githubSearch({
        review: ["awaiting-me-or-team"],
        labels: ["needs-review", "checkout"],
      }),
      ["review-requested:@me", 'label:"needs-review"', 'label:"checkout"'],
    )
  })

  test("quotes a label with a space in it", () => {
    assert.deepStrictEqual(githubSearch({ review: [], labels: ["needs review"] }), [
      'label:"needs review"',
    ])
  })

  test("drops a blank label rather than searching for nothing", () => {
    assert.deepStrictEqual(githubSearch({ review: [], labels: ["  ", "real"] }), [
      'label:"real"',
    ])
  })

  test("ignores a review option it does not know", () => {
    // Hand-edited settings, or a key from a later version. Better a wider list
    // than a search that cannot run.
    assert.deepStrictEqual(
      githubSearch({ review: ["nonsense", "approved"], labels: [] }),
      ["review:approved"],
    )
  })
})
