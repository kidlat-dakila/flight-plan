import { describe, expect, it } from "vitest"
import { documentInput } from "../../../../lib/schemas/document/schema"
import { resolve, type ResolveSource } from "../resolve"

const head = "4a12380000000000000000000000000000000000"

const file = [
  "line 1",
  "line 2",
  "export async function hasStock(basket) {",
  "  const ids = basket.map((l) => l.productId)",
  "  const levels = await levelsFor(ids)",
  "  return { ok: true }",
  "}",
].join("\n")

const input = (code: Record<string, unknown>) =>
  documentInput.parse({
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
    title: "t",
    contextBody: {
      context: "x",
      overview: [{ when: "a", then: "b" }],
      implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
    },
    diagram: { absent: "none" },
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: ["Added it."],
          waypoints: [{ id: "g", title: "Added it", reading: "It does.", code }],
        },
      ],
    },
  })

const source = (over: Partial<ResolveSource> = {}): ResolveSource => ({
  at: head,
  readFile: (path) => Promise.resolve(path === "src/a.ts" ? file : null),
  hunks: { "src/a.ts": { added: [{ from: 4, to: 5 }], removed: [] } },
  findSymbol: null,
  ...over,
})

const ref = { kind: "ref", lang: "ts", path: "src/a.ts" }

const codeOf = (out: Awaited<ReturnType<typeof resolve>>) => {
  if (!out.ok) throw new Error("expected resolution to succeed")
  return out.document.codeWalkthrough.files[0]?.waypoints[0]?.code
}

describe("resolve", () => {
  it("should capture the first line of a focus as expect", async () => {
    const out = await resolve(input({ ...ref, target: { focus: [3, 7] } }), source())
    expect(codeOf(out)).toMatchObject({
      focus: { from: 3, to: 7 },
      expect: "export async function hasStock(basket) {",
    })
  })

  it("should turn covers into marks", async () => {
    const out = await resolve(
      input({ ...ref, target: { focus: [3, 7] }, covers: [0] }),
      source(),
    )
    expect(codeOf(out)).toMatchObject({ marks: [{ from: 4, to: 5 }] })
  })

  it("should clip a covered hunk to the focus", async () => {
    // What a new file produces: its one hunk is the whole file, so an unclipped
    // mark would highlight every line for every waypoint in it.
    const out = await resolve(
      input({ ...ref, target: { focus: [4, 5] }, covers: [0] }),
      source({ hunks: { "src/a.ts": { added: [{ from: 1, to: 7 }], removed: [] } } }),
    )
    expect(codeOf(out)).toMatchObject({ marks: [{ from: 4, to: 5 }] })
  })

  it("should keep a covered hunk that lies outside the focus", async () => {
    const out = await resolve(
      input({ ...ref, target: { focus: [1, 2] }, covers: [0] }),
      source(),
    )
    expect(codeOf(out)).toMatchObject({ marks: [{ from: 4, to: 5 }] })
  })

  it("should refuse a covers index the file's diff does not have", async () => {
    // Off by one here points the reader at a different block with no sign that
    // anything went wrong, so it refuses rather than dropping the mark.
    const out = await resolve(
      input({ ...ref, target: { focus: [3, 7] }, covers: [4] }),
      source(),
    )
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("has 1 hunk")
  })

  it("should refuse a focus past the end of the file", async () => {
    const out = await resolve(input({ ...ref, target: { focus: [3, 99] } }), source())
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("7 lines")
  })

  it("should refuse a path that is not in the repository", async () => {
    const out = await resolve(
      input({ ...ref, path: "src/gone.ts", target: { focus: [1, 2] } }),
      source(),
    )
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("does not exist")
  })

  it("should refuse a symbol when no provider can answer, and name the fallback", async () => {
    // The ordinary case until piece 2 lands. The message has to say what to
    // write instead, or the agent retries the same thing.
    const out = await resolve(input({ ...ref, target: { symbol: "hasStock" } }), source())
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("focus")
  })

  it("should resolve a symbol when a provider answers", async () => {
    const out = await resolve(input({ ...ref, target: { symbol: "hasStock" } }), {
      ...source(),
      findSymbol: () => Promise.resolve({ from: 3, to: 7 }),
    })
    expect(codeOf(out)).toMatchObject({ focus: { from: 3, to: 7 } })
  })

  it("should refuse a symbol the provider cannot find, and say so by name", async () => {
    const out = await resolve(input({ ...ref, target: { symbol: "gone" } }), {
      ...source(),
      findSymbol: () => Promise.resolve(null),
    })
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("gone")
  })

  it("should build one sources entry per path a fence names", async () => {
    const out = await resolve(input({ ...ref, target: { focus: [3, 7] } }), source())
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect(out.document.sources).toEqual({
      "src/a.ts": { at: head, hunks: { added: [{ from: 4, to: 5 }], removed: [] } },
    })
  })

  it("should capture the position's line as expect on a proposal", async () => {
    const out = await resolve(
      input({
        kind: "proposal",
        lang: "ts",
        path: "src/a.ts",
        position: { kind: "replace", lines: [5, 5] },
        body: "  const levels = await levelsFor(ids, { fresh: true })",
      }),
      source(),
    )
    expect(codeOf(out)).toMatchObject({
      expect: "  const levels = await levelsFor(ids)",
    })
  })

  it("should refuse a proposal positioned past the end of the file", async () => {
    // Harder than a wrong range, and worth its own check: a wrong range shows
    // the reader the wrong lines, a wrong position tells them to write new
    // code in the wrong place, and they will.
    const out = await resolve(
      input({
        kind: "proposal",
        lang: "ts",
        path: "src/a.ts",
        position: { kind: "after", line: 99 },
        body: "x",
      }),
      source(),
    )
    expect(out.ok).toBe(false)
    expect(out.findings[0]?.message).toContain("past the end")
  })

  it("should accept a new-file proposal for a file that does not exist", async () => {
    // The one fence whose path is meant to be missing: `new` says the body is
    // all of a file nobody has written yet.
    const out = await resolve(
      input({
        kind: "proposal",
        lang: "ts",
        path: "src/new.ts",
        position: { kind: "new" },
        body: "export const x = 1",
      }),
      source(),
    )
    expect(out.ok).toBe(true)
    expect(codeOf(out)).toMatchObject({ path: "src/new.ts", expect: undefined })
  })

  it("should produce a document the stored schema accepts", async () => {
    // The contract between this task and the last one. A resolver that
    // produced something the stored schema refuses would fail only at the
    // write, which is after the agent has gone.
    const { storedDocument } = await import("../../../../lib/schemas/document/stored")
    const out = await resolve(
      input({ ...ref, target: { focus: [3, 7] }, covers: [0] }),
      source(),
    )
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect(storedDocument.safeParse(out.document).success).toBe(true)
  })
})

describe("resolve and the anchor it records", () => {
  it("should record no anchor when the focus starts on a blank line", async () => {
    // Found by rendering a real document: the resolver wrote an empty string,
    // which the stored schema then refused, so a valid document could not be
    // stored. A blank anchor is also useless -- repairRange matches it against
    // every blank line in the file and reports the range lost.
    const blankFirst = ["one", "", "three", "four"].join("\n")
    const out = await resolve(input({ ...ref, target: { focus: [2, 4] } }), {
      ...source(),
      readFile: () => Promise.resolve(blankFirst),
      hunks: {},
    })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const code = out.document.codeWalkthrough.files[0]?.waypoints[0]?.code
    expect(code).toMatchObject({ focus: { from: 2, to: 4 } })
    expect((code as { expect?: string }).expect).toBeUndefined()
  })

  it("should record no anchor when the focus starts on whitespace", async () => {
    const spaced = ["one", "   ", "three"].join("\n")
    const out = await resolve(input({ ...ref, target: { focus: [2, 3] } }), {
      ...source(),
      readFile: () => Promise.resolve(spaced),
      hunks: {},
    })
    if (!out.ok) throw new Error("expected resolution to succeed")
    const code = out.document.codeWalkthrough.files[0]?.waypoints[0]?.code
    expect((code as { expect?: string }).expect).toBeUndefined()
  })
})

const mainSha = "9f2c1b7e4d3a5068bb1c2d3e4f50617283945a6b"

/** `src/other.ts` on main, and `src/added.ts` only on the branch. */
const mainFiles: Record<string, string> = {
  "src/other.ts": ["one", "two", "three"].join("\n"),
}

const branchOnly: Record<string, string> = {
  "src/added.ts": ["added one", "added two"].join("\n"),
}

const withMain = (): ResolveSource => ({
  ...source(),
  readFile: (path) =>
    Promise.resolve(
      path === "src/a.ts"
        ? file
        : (branchOnly[path] ?? mainFiles[path] ?? null),
    ),
  main: {
    at: mainSha,
    readFile: (path) => Promise.resolve(mainFiles[path] ?? null),
  },
})

describe("the code links in a document's prose", () => {
  const withLink = (text: string) =>
    documentInput.parse({
      schema: 1,
      meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
      title: "t",
      contextBody: {
        context: "x",
        overview: [{ when: "a", then: text }],
        implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
      },
      diagram: { absent: "none" },
      codeWalkthrough: { files: [] },
    })

  it("should accept a link to lines inside the file", async () => {
    const out = await resolve(withLink("it runs [these](code:src/a.ts#L3-5)."), source())
    expect(out.ok).toBe(true)
  })

  it("should refuse a link to a file that is not there", async () => {
    // The whole reason to write a link instead of a sentence: a sentence
    // describing code that does not exist reads exactly like one that does.
    const out = await resolve(withLink("see [this](code:src/gone.ts#L1-2)."), source())
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.message).toContain("does not exist")
    expect(out.findings[0]?.at).toBe("contextBody.overview[0].then")
  })

  it("should refuse a link past the end of the file", async () => {
    const out = await resolve(withLink("see [this](code:src/a.ts#L90-99)."), source())
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.message).toContain("past the end")
  })

  it("should refuse a symbol link even when a provider could answer", async () => {
    // A link is a path and lines. The symbol form went away so that one lookup
    // rule -- the diff first, then the mainline -- answers every link, which a
    // symbol resolved against a language server could never join.
    const out = await resolve(
      withLink("it calls [`hasStock()`](code:src/a.ts#hasStock)."),
      { ...source(), findSymbol: () => Promise.resolve({ from: 3, to: 7 }) },
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.message).toContain("#L<from>-<to>")
  })

  it("should check a link into a file the change does not touch against the mainline", async () => {
    // The lines a reader wants for code outside the change are the ones on
    // main, not the ones on a branch that may be weeks old.
    const out = await resolve(withLink("see [this](code:src/other.ts#L3)."), withMain())
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.document.sources["src/other.ts"]?.at).toBe(mainSha)
  })

  it("should refuse a link past the end of the mainline version, and say where it looked", async () => {
    const out = await resolve(withLink("see [this](code:src/other.ts#L9)."), withMain())
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.message).toContain("past the end")
    expect(out.findings[0]?.message).toContain(mainSha.slice(0, 8))
  })

  it("should keep reading a changed file at the document's own commit", async () => {
    // `src/a.ts` is in the diff, so the version the walkthrough is about is the
    // one on the branch -- the mainline copy is the code before the change.
    const out = await resolve(withLink("see [this](code:src/a.ts#L7)."), withMain())
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.document.sources["src/a.ts"]?.at).toBe(head)
  })

  it("should fall back to the branch when a file is not on the mainline, and warn", async () => {
    // A file the branch added in an earlier commit is in neither the diff nor
    // main. Refusing would make a walkthrough of a stacked branch unwritable.
    const out = await resolve(withLink("see [this](code:src/added.ts#L2)."), withMain())
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.document.sources["src/added.ts"]?.at).toBe(head)
    expect(out.findings[0]?.severity).toBe("warning")
    expect(out.findings[0]?.message).toContain("origin/main")
  })

  it("should warn when a backticked label is not in the lines it points at", async () => {
    // The label is the anchor. Without this, a line number written into a
    // sentence goes stale in silence -- there is nowhere in a sentence to put
    // the repair text a fence carries.
    const out = await resolve(withLink("see [`gone()`](code:src/a.ts#L1-2)."), source())
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.findings[0]?.severity).toBe("warning")
    expect(out.findings[0]?.message).toContain("not in the lines it points at")
  })

  it("should not anchor a label that names no code", async () => {
    // The first step of a trigger trace names a user action, and "Submit" is
    // not a symbol to look for. Backticks are what make a label an anchor.
    const out = await resolve(withLink("a customer [presses Pay](code:src/a.ts#L1-2)."), source())
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.findings).toEqual([])
  })

  it("should check a link in a waypoint's reading too", async () => {
    const doc = documentInput.parse({
      schema: 1,
      meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
      title: "t",
      contextBody: {
        context: "x",
        overview: [{ when: "a", then: "b" }],
        implementation: [{ label: "src/a.ts", items: [{ text: "x" }] }],
      },
      diagram: { absent: "none" },
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              {
                id: "g",
                title: "Added it",
                reading: "It calls [this](code:src/gone.ts#L1).",
                code: { ...ref, target: { focus: [3, 7] } },
              },
            ],
          },
        ],
      },
    })
    const out = await resolve(doc, source())
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.at).toBe(
      "codeWalkthrough.files[0].waypoints[0].reading",
    )
  })
})

/**
 * A contract and an effect are prose, and prose here carries `code:` links.
 *
 * They name types, fields, declarations and call sites, and naming one with a
 * link rather than in prose is what lets a reader go and look instead of taking
 * the sentence's word for it. Unchecked, the link is decoration.
 */
describe("resolve and the blast radius", () => {
  const withBlast = (nodes: Record<string, unknown>[]) =>
    documentInput.parse({
      schema: 1,
      meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
      title: "t",
      contextBody: { context: "x" },
      diagram: { absent: "none" },
      blast: {
        type: "blast",
        seed: { diff: { base: "b".repeat(40), head } },
        nodes,
        edges: [],
      },
      codeWalkthrough: { files: [] },
    })

  const node = (over: Record<string, unknown>) => ({
    id: "src/a.ts:3",
    label: "hasStock",
    path: "src/a.ts",
    lines: [3, 7],
    hop: 0,
    changed: true,
    ...over,
  })

  it("should accept a contract whose links resolve", async () => {
    const out = await resolve(
      withBlast([
        node({
          contract: {
            before: "[`hasStock`](code:src/a.ts#L3-7) returned a boolean.",
            now: "[`hasStock`](code:src/a.ts#L3-7) returns `{ ok }`.",
          },
        }),
      ]),
      source(),
    )
    expect(out.ok).toBe(true)
  })

  it("should refuse a contract naming a file that is not there", async () => {
    const out = await resolve(
      withBlast([
        node({
          contract: { before: null, now: "See [it](code:src/gone.ts#L1-2)." },
        }),
      ]),
      source(),
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings.some((f) => f.at.includes("blast.nodes[0].contract.now"))).toBe(true)
  })

  it("should refuse an effect whose link runs past the end of the file", async () => {
    const out = await resolve(
      withBlast([
        node({ changed: undefined, hop: 1, changeType: "breaks", effect: "At [here](code:src/a.ts#L1-900)." }),
      ]),
      source(),
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings.some((f) => f.at.includes("blast.nodes[0].effect"))).toBe(true)
  })

  it("should check the before half as well as the now half", async () => {
    const out = await resolve(
      withBlast([
        node({ contract: { before: "Was [gone](code:src/gone.ts#L1-2).", now: "Is fine." } }),
      ]),
      source(),
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings.some((f) => f.at.includes("contract.before"))).toBe(true)
  })
})

/*
 * Paths with brackets in them, which Markdown truncates.
 *
 * A bare link destination ends at the first `)`, so a route group —
 * `app/(checkout)/page.tsx` — parses as a path cut in half. The syntax has an answer, pointy brackets, and
 * the failure has to point at it: the old message said "Check the path", which
 * sends an author to look at the one thing that was right.
 */
describe("resolve, a link whose path has brackets", () => {
  const routed = (over: Partial<ResolveSource> = {}): ResolveSource => ({
    at: head,
    readFile: (path) =>
      Promise.resolve(path === "app/(checkout)/page.tsx" ? file : null),
    hunks: {},
    findSymbol: null,
    ...over,
  })

  const withLink = (text: string) =>
    documentInput.parse({
      schema: 1,
      meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
      title: "t",
      contextBody: {
        context: "x",
        overview: [{ when: "a", then: text }],
        implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
      },
      diagram: { absent: "none" },
      codeWalkthrough: { files: [] },
    })

  it("should accept the pointy-bracket form", async () => {
    const out = await resolve(
      withLink("see [this](<code:app/(checkout)/page.tsx#L1-2>)."),
      routed(),
    )
    expect(out.ok).toBe(true)
  })

  it("should accept a percent-encoded path, which is what an author tries next", async () => {
    const out = await resolve(
      withLink("see [this](code:app/%28checkout%29/page.tsx#L1-2)."),
      routed(),
    )
    expect(out.ok).toBe(true)
  })

  it("should name the bracket rule when a bare path was cut in half", async () => {
    const out = await resolve(
      withLink("see [this](code:app/(checkout)/page.tsx#L1-2)."),
      routed(),
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    const { message } = out.findings[0] ?? { message: "" }
    expect(message).toContain("<code:")
    expect(message).not.toContain("Check the path")
  })

  it("should still say check the path when the path is simply wrong", async () => {
    const out = await resolve(withLink("see [this](code:src/gone.ts#L1-2)."), source())
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.findings[0]?.message).toContain("Check the path")
  })
})
