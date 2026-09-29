import { describe, expect, it } from "vitest"
import { documentView, proseFields, referencedPaths } from "../view"
import type { StoredDocument } from "../../../lib/schemas/document/stored"

/**
 * The layout comes from the document's structure: headings and lists are
 * built around the prose fields, and nothing is read back from Markdown.
 */

const waypoint = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `The ${id} step`,
  reading: `What ${id} does.`,
  code: { kind: "ref", lang: "ts", path: "src/a.ts", focus: { from: 1, to: 2 }, expect: "one" },
  ...over,
})

function doc(over: Partial<Record<string, unknown>> = {}): StoredDocument {
  return {
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head: "abc1234", status: "complete" },
    title: "Reserve `stock` first",
    contextBody: {
      context: "Why it <matters>.",
      overview: [{ when: "a line is **short**", then: "it says so" }],
      implementation: [{ label: "src/<a>.ts", items: [{ text: "Added `f`." }] }],
    },
    diagram: { absent: "No flow to draw." },
    codeWalkthrough: {
      note: "Read it in order.",
      files: [
        { path: "src/a.ts", summary: ["Added `f`."], waypoints: [waypoint("a", { children: [waypoint("a1"), waypoint("a2")] })] },
        { path: "src/b.ts", summary: [], waypoints: [] },
      ],
    },
    sources: {},
    ...over,
  } as unknown as StoredDocument
}

describe("documentView", () => {
  it("should build the lead from the fields, escaping what is not Markdown", () => {
    const view = documentView(doc())
    const html = view.lead.map((block) => (block.kind === "prose" ? block.html : block.kind))
    expect(html[0]).toBe("<h1>Reserve <code>stock</code> first</h1>\n")
    expect(html[1]).toContain("<h2>Context</h2>")
    expect(html[1]).toContain("Why it &lt;matters&gt;.")
    expect(html[2]).toContain("<strong>When</strong> a line is <strong>short</strong>")
    expect(html[3]).toContain("<strong><code>src/&lt;a&gt;.ts</code></strong>")
    expect(html.slice(4)).toEqual(["<h2>Diagram</h2>\n", "<p>No flow to draw.</p>\n"])
    expect(view.intro.map((block) => [block.kind === "prose" ? block.html : block.kind, block.level])).toEqual([
      ["<h2>Code Walkthrough</h2>\n", 2],
      ["<p>Read it in order.</p>\n", 3],
    ])
  })

  it("should put the block under Diagram and Blast Radius one level deeper, so the arrows fold it", () => {
    const view = documentView(doc({ diagram: { type: "code" }, blast: { absent: "Not walked." } }))
    expect(view.lead.slice(4).map((block) => [block.kind, block.level])).toEqual([
      ["prose", 2],
      ["diagram", 3],
      ["prose", 2],
      ["prose", 3],
    ])
  })

  it("should draw a diagram as a block and a blast radius only when one is there", () => {
    const drawn = documentView(doc({ diagram: { type: "code" }, blast: { absent: "Not walked." } }))
    expect(drawn.lead.map((block) => block.kind)).toEqual(["prose", "prose", "prose", "prose", "prose", "diagram", "prose", "prose"])
    expect(documentView(doc()).lead.some((block) => block.kind === "blast")).toBe(false)
  })

  it("should flatten waypoints with their depth and keep their ids", () => {
    const view = documentView(doc())
    expect(view.steps.map((step) => [step.id, step.level])).toEqual([["a", 3], ["a1", 4], ["a2", 4]])
    expect(view.sections[0]).toEqual({
      key: "src/a.ts",
      file: true,
      titleHtml: "",
      summaryHtml: "<ul>\n<li>Added <code>f</code>.</li>\n</ul>\n",
      steps: [0, 1, 2],
    })
    expect(view.steps[0]?.code?.anchor).toBe("one")
  })

  it("should draw a document finding as a card carrying its kind and its trace", () => {
    const view = documentView(
      doc({ findings: [{ id: "f", kind: "bug", title: "It drops one", reading: "Proven.", trace: ["`f` runs", "it returns"], code: null }] }),
    )
    const finding = view.steps[view.steps.length - 1]
    expect(finding?.badge).toBe("bug")
    expect(finding?.title).toBe("It drops one")
    expect("html" in (finding?.prose ?? { markdown: "" }) ? (finding?.prose as { html: string }).html : "").toContain(
      "<ol>\n<li><code>f</code> runs</li>",
    )
    expect(view.sections[view.sections.length - 1]).toEqual({ key: "Findings", file: false, titleHtml: "", summaryHtml: "", steps: [3] })
  })

  it("should give a document finding's card its fix, and not a second finding", () => {
    const fix = { lang: "ts", body: "return 2" }
    const view = documentView(
      doc({ findings: [{ id: "f", kind: "nit", title: "t", reading: "r", code: null, solution: fix }] }),
    )
    const card = view.steps[view.steps.length - 1]
    expect(card?.solution).toEqual(fix)
    expect(card?.findings).toBeUndefined()
  })

  it("should give the tour its heading before it has a card", () => {
    // No note either, so the heading is the whole intro.
    const empty = documentView(doc({ codeWalkthrough: { files: [] } }))
    expect(empty.intro).toHaveLength(1)
    expect(empty.sections).toEqual([])
  })

  it("should keep a file with no waypoints as a section that names its path", () => {
    const view = documentView(doc())
    expect(view.sections[1]).toEqual({
      key: "src/b.ts",
      file: true,
      titleHtml: "<h2><code>src/b.ts</code></h2>\n",
      summaryHtml: "",
      steps: [],
    })
  })

  it("should list the files to read and every prose field", () => {
    const document = doc()
    expect(referencedPaths(documentView(document).steps)).toEqual(["src/a.ts"])
    expect(proseFields(document)).toEqual(
      expect.arrayContaining(["Why it <matters>.", "a line is **short**", "Read it in order.", "What a1 does.", "No flow to draw."]),
    )
  })
})
