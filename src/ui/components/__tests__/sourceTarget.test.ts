import { describe, expect, test } from "vitest"
import { sourceTarget } from "../Walkthrough"

const links = {
  prUrl: "https://github.com/owner/repo/pull/7",
  anchors: { "src/changed.ts": "abc123" },
}
const at = { repo: "owner/repo", sha: "f".repeat(40) }
const range = { from: 10, to: 20 }

describe("sourceTarget", () => {
  test("a changed file goes to the pull request, even when it is on disk", () => {
    /*
     * The opposite priority to the hover card's path link, deliberately. For a
     * file the change touches there is a diff to read and a place to comment,
     * and that is what "source" means to a reviewer.
     */
    const target = sourceTarget(true, links, at, ["src/changed.ts"], "src/changed.ts", range)
    expect(target?.kind).toBe("link")
    expect(target).toMatchObject({ href: expect.stringContaining("/pull/7") })
  })

  test("an unchanged file opens in the editor", () => {
    expect(
      sourceTarget(false, links, at, ["src/context.ts"], "src/context.ts", range),
    ).toEqual({ kind: "editor", path: "src/context.ts", line: 10 })
  })

  test("an unchanged file that is not on disk falls back to the web", () => {
    // Reviewing a branch that was never checked out: there is no local copy to
    // open, so a permalink at the walkthrough's own commit is the honest answer.
    const target = sourceTarget(false, links, at, [], "src/context.ts", range)
    expect(target?.kind).toBe("link")
    expect(target).toMatchObject({ href: expect.stringContaining("f".repeat(40)) })
  })

  test("a changed file with no diff anchor still reaches the editor", () => {
    // `anchors` only covers files the diff actually carried.
    expect(
      sourceTarget(true, links, at, ["src/other.ts"], "src/other.ts", range),
    ).toEqual({ kind: "editor", path: "src/other.ts", line: 10 })
  })

  test("nothing to offer when there is neither a copy nor a commit", () => {
    expect(sourceTarget(false, null, null, [], "src/x.ts", range)).toBeNull()
  })
})
