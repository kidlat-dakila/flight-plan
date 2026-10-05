import * as assert from "node:assert"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { asGitAdapterError } from "@/git-adapter/custom-providers/github-cli-forge-adapter"
import { githubSearch, type ReviewFilter } from "@/git-adapter/helpers/github-shared"

const run = promisify(execFile)

async function failureOf(command: string, args: string[] = []): Promise<unknown> {
  try {
    await run(command, args)
    assert.fail(`${command} was expected to fail`)
  } catch (cause) {
    return cause
  }
}

suite("classifying a `gh` failure", () => {
  it("a missing binary is recognised, and not from its stderr", async () => {
    const cause = await failureOf("flightplan-definitely-not-installed")

    const stderrField: unknown = typeof cause === "object" && cause !== null ? Reflect.get(cause, "stderr") : undefined
    const stderr = typeof stderrField === "string" ? stderrField : ""
    assert.strictEqual(stderr, "")
    assert.ok(!stderr.includes("ENOENT"))
    assert.ok(String(cause).includes("ENOENT"))

    const error = asGitAdapterError(cause)
    assert.strictEqual(error.problem, "no-cli")
    assert.strictEqual(error.message, "The GitHub CLI is not installed here.")
  })

  it("a command that runs and fails keeps its own words", async () => {
    const error = asGitAdapterError(await failureOf("/usr/bin/false"))
    assert.strictEqual(error.problem, "unknown")
    assert.notStrictEqual(error.message, "")
  })

  it("being signed out is told apart from being absent", () => {
    const error = asGitAdapterError(
      Object.assign(new Error("exited with code 1"), {
        code: 1,
        stderr: "gh: To use GitHub CLI in a GitHub Actions workflow, ... not logged in",
      }),
    )
    assert.strictEqual(error.problem, "auth")
  })

  it("a directory with no GitHub remote is its own case", () => {
    const error = asGitAdapterError(
      Object.assign(new Error("exited with code 1"), {
        code: 1,
        stderr: "fatal: not a git repository (or any of the parent directories): .git",
      }),
    )
    assert.strictEqual(error.problem, "no-repo")
  })
})

suite("building the pull request search", () => {
  it("no filter at all asks for nothing in particular", () => {
    assert.deepStrictEqual(githubSearch({ review: [], labels: [] }), [])
  })

  it("each review option is the qualifier GitHub documents", () => {
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

  it("several review options combine, in a fixed order", () => {
    assert.deepStrictEqual(
      githubSearch({ review: ["awaiting-me", "required"], labels: [] }),
      ["review:required", "user-review-requested:@me"],
    )
  })

  it("adds one qualifier per label, since GitHub ands them", () => {
    assert.deepStrictEqual(
      githubSearch({
        review: ["awaiting-me-or-team"],
        labels: ["needs-review", "checkout"],
      }),
      ["review-requested:@me", "label:\"needs-review\"", "label:\"checkout\""],
    )
  })

  it("quotes a label with a space in it", () => {
    assert.deepStrictEqual(githubSearch({ review: [], labels: ["needs review"] }), [
      "label:\"needs review\"",
    ])
  })

  it("drops a blank label rather than searching for nothing", () => {
    assert.deepStrictEqual(githubSearch({ review: [], labels: ["  ", "real"] }), [
      "label:\"real\"",
    ])
  })

  it("ignores a review option it does not know", () => {
    assert.deepStrictEqual(
      githubSearch({ review: ["nonsense", "approved"], labels: [] }),
      ["review:approved"],
    )
  })
})
