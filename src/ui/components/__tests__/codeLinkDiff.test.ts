import { describe, expect, test } from "vitest"
import { prepareCodeLinks } from "../Walkthrough"
import type { CodeLink } from "../../../lib/schemas/document/codeLinks"

/**
 * The diff in a `code:` link's hover popup.
 *
 * The popup showed none. Every other code surface pushes `diff` annotations —
 * `highlightReference` for a waypoint's panel, `highlightProposal` for a plan —
 * and this one pushed only `focus`, so a reader hovering a link into changed
 * code saw the lines and no sign that the change had touched them. The handler
 * and the stylesheet were already in place; nothing supplied the data.
 */
const file = [
  "one", // 1
  "two", // 2
  "three", // 3
  "four", // 4
  "five", // 5
].join("\n")

const link = (over: Partial<CodeLink> = {}): CodeLink => ({
  label: "`three`",
  path: "src/a.ts",
  lines: { from: 3, to: 3 },
  symbol: null,
  target: "code:src/a.ts#L3",
  at: 0,
  ...over,
})

const files = new Map([["src/a.ts", { text: file }]])

const prepare = async (diffs: Parameters<typeof prepareCodeLinks>[3], one = link()) =>
  await prepareCodeLinks([one], files, "github-dark", diffs)

const names = (annotations: readonly { name: string }[]) => annotations.map((a) => a.name)

describe("prepareCodeLinks and the diff", () => {
  test("marks an added line the link points at", async () => {
    const excerpts = await prepare({ "src/a.ts": { added: [{ from: 3, to: 3 }], removed: [] } })
    const code = excerpts["code:src/a.ts#L3"]?.code
    expect(names(code?.annotations ?? [])).toContain("diff")
    const diff = code?.annotations.find((a) => a.name === "diff")
    expect(diff?.query).toBe("+")
  })

  test("pushes nothing when the file has no diff", async () => {
    const excerpts = await prepare(null)
    expect(names(excerpts["code:src/a.ts#L3"]?.code.annotations ?? [])).not.toContain("diff")
  })

  test("pushes nothing when the change is outside the excerpt's window", async () => {
    // The window is the named line with ten either side, so a change at line
    // 400 of a five-line file cannot be in it.
    const excerpts = await prepare({ "src/a.ts": { added: [{ from: 400, to: 400 }], removed: [] } })
    expect(names(excerpts["code:src/a.ts#L3"]?.code.annotations ?? [])).not.toContain("diff")
  })

  test("splices a removed block back in, so a deletion is visible too", async () => {
    const excerpts = await prepare({
      "src/a.ts": { added: [], removed: [{ after: 3, lines: ["gone"] }] },
    })
    const excerpt = excerpts["code:src/a.ts#L3"]
    const diff = excerpt?.code.annotations.find((a) => a.name === "diff")
    expect(diff?.query).toBe("-")
    // A removed line is in the block and in no file, so the gutter cannot be a
    // start plus an offset any more.
    expect(excerpt?.fileNumbers).toEqual([1, 2, 3, null, 4, 5])
  })

  test("keeps the focus on the named lines once a removal has shifted them", async () => {
    const excerpts = await prepare(
      { "src/a.ts": { added: [], removed: [{ after: 1, lines: ["gone"] }] } },
      link({ lines: { from: 3, to: 3 }, target: "code:src/a.ts#L3" }),
    )
    const focus = excerpts["code:src/a.ts#L3"]?.code.annotations.find(
      (a) => a.name === "focus",
    ) as { fromLineNumber?: number; toLineNumber?: number } | undefined
    // File line 3 is the fourth rendered line: one line was spliced in above it.
    expect(focus?.fromLineNumber).toBe(4)
    expect(focus?.toLineNumber).toBe(4)
  })
})
