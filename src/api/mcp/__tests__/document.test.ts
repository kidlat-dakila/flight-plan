import { describe, expect, it } from "vitest"
import { writeDocument } from "../document"
import type { Repository } from "../repository"

const head = "4a12380000000000000000000000000000000000"
const base = "c1f1b88000000000000000000000000000000000"

const file = [
  "export function hasStock(basket) {",
  "  const ids = basket.map((l) => l.id)",
  "  return ids.length > 0",
  "}",
].join("\n")

const tree: Repository = {
  head,
  readFile: (path) => Promise.resolve(path === "src/a.ts" ? file : null),
  changedFiles: () => Promise.resolve([]),
}

const doc = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head, base },
    title: "Check the basket",
    contextBody: {
      context: "Checkout refuses once.",
      overview: [{ when: "a line is short", then: "it says so." }],
      implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
    },
    diagram: { absent: "No flow to draw." },
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: ["Added it."],
          waypoints: [
            {
              id: "g",
              title: "Added the guard",
              reading: "It refuses.",
              code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { focus: [1, 4] } },
            },
          ],
        },
      ],
    },
    ...over,
  })

describe("writeDocument", () => {
  it("should resolve a document and store what it resolved", async () => {
    const out = await writeDocument(doc(), "walkthrough", tree, null, { findSymbol: null })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const stored = JSON.parse(out.stored) as Record<string, any>
    // The author wrote a target; storage carries the resolved range and the
    // text that repairs it, neither of which anybody typed.
    const code = stored["codeWalkthrough"].files[0].waypoints[0].code
    expect(code.focus).toEqual({ from: 1, to: 4 })
    expect(code.expect).toBe("export function hasStock(basket) {")
    expect(stored["sources"]["src/a.ts"].at).toBe(head)
  })

  it("should read a file the change does not touch on the mainline", async () => {
    // `src/other.ts` is in no hunk, so its lines are the mainline's lines. The
    // branch's copy is whatever it was when somebody forked, which is not the
    // code a reader opening the link has.
    const mainSha = "9f2c1b7e4d3a5068bb1c2d3e4f50617283945a6b"
    const withLink = doc({
      contextBody: {
        context: "Checkout refuses once.",
        overview: [
          { when: "a line is short", then: "it says so, from [this](code:src/other.ts#L2)." },
        ],
        implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
      },
    })
    const out = await writeDocument(withLink, "walkthrough", tree, null, {
      findSymbol: null,
      main: {
        at: mainSha,
        readFile: (path) =>
          Promise.resolve(path === "src/other.ts" ? "one\ntwo\nthree" : null),
      },
    })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const stored = JSON.parse(out.stored) as Record<string, any>
    expect(stored["sources"]["src/other.ts"].at).toBe(mainSha)
    expect(stored["sources"]["src/a.ts"].at).toBe(head)
  })

  it("should refuse a link that names a symbol, and say what to write instead", async () => {
    const withSymbol = doc({
      contextBody: {
        context: "Checkout refuses once.",
        overview: [
          {
            when: "a line is short",
            then: "it says so, from [`hasStock()`](code:src/a.ts#hasStock).",
          },
        ],
        implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
      },
    })
    const out = await writeDocument(withSymbol, "walkthrough", tree, null, {
      findSymbol: () => Promise.resolve({ from: 1, to: 4 }),
      main: null,
    })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("#L<from>-<to>")
  })

  it("should refuse a document that is not valid JSON", async () => {
    const out = await writeDocument("{ nope", "walkthrough", tree, null, { findSymbol: null })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("not valid JSON")
  })

  it("should refuse a document the schema rejects, naming the field", async () => {
    // The message is the product: an agent told which field is wrong fixes it
    // in one turn, where "invalid document" makes it regenerate everything.
    const out = await writeDocument(
      doc({ meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 } } }),
      "walkthrough",
      tree,
      null,
      { findSymbol: null },
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("meta")
  })

  it("should refuse a document whose kind disagrees with the tool", async () => {
    const out = await writeDocument(doc(), "plan", tree, null, { findSymbol: null })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("have to agree")
  })

  it("should refuse a range past the end of the file", async () => {
    const out = await writeDocument(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "g",
                  title: "Added the guard",
                  reading: "It refuses.",
                  code: {
                    kind: "ref",
                    lang: "ts",
                    path: "src/a.ts",
                    target: { focus: [1, 99] },
                  },
                },
              ],
            },
          ],
        },
      }),
      "walkthrough",
      tree,
      null,
      { findSymbol: null },
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("past the end")
  })

  it("should refuse a symbol and name the fallback", async () => {
    const out = await writeDocument(
      doc({
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: [],
              waypoints: [
                {
                  id: "g",
                  title: "Added the guard",
                  reading: "It refuses.",
                  code: {
                    kind: "ref",
                    lang: "ts",
                    path: "src/a.ts",
                    target: { symbol: "hasStock" },
                  },
                },
              ],
            },
          ],
        },
      }),
      "walkthrough",
      tree,
      null,
      { findSymbol: null },
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("focus")
  })

  it("should refuse when no checkout can resolve the references", async () => {
    // Harder than the Markdown path, and it has to be: a stored document must
    // carry a range for every fence, so there is no half-resolved fallback.
    const out = await writeDocument(doc(), "walkthrough", null, null, { findSymbol: null })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("no VS Code window")
  })

  it("should say so when it could not compute the marks", async () => {
    const out = await writeDocument(doc(), "walkthrough", tree, null, { findSymbol: null })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.warnings).toContain("No marks were computed")
  })

  it("should not ask for a diff when the document is a plan", async () => {
    const plan = doc({
      meta: { kind: "plan", repo: "acme/storefront", name: "p" },
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              {
                id: "g",
                title: "Add the guard",
                reading: "Put it above the return.",
                code: {
                  kind: "proposal",
                  lang: "ts",
                  path: "src/a.ts",
                  position: { kind: "after", line: 2 },
                  body: "  if (ids.length === 0) return false",
                },
              },
            ],
          },
        ],
      },
    })
    const out = await writeDocument(plan, "plan", tree, null, { findSymbol: null })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.warnings).not.toContain("No marks were computed")
    const stored = JSON.parse(out.stored) as Record<string, any>
    // A plan resolves against a tree, not a commit, so it records no sha.
    expect(stored["sources"]["src/a.ts"].at).toBeNull()
    expect(stored["codeWalkthrough"].files[0].waypoints[0].code.expect).toBe(
      "  const ids = basket.map((l) => l.id)",
    )
  })

  /*
   * The symbol substrate: a file the
   * change does not touch is read on the mainline, so its symbol must be looked
   * up in that text too. Here the declaration sits on line 1 at the head and on
   * line 4 on main; the range, the anchor and the recorded commit must all be
   * main's.
   */
  it("should look a symbol up in the text it read, on the mainline", async () => {
    const mainSha = "7e5d3c1b9a8f6e4d2c0b1a3f5e7d9c2b4a6f8e1d"
    const atHead = "export function target(): number {\n  return 1\n}\n"
    const onMain = `// one\n// two\n// three\n${atHead}`
    const both: Repository = {
      head,
      readFile: (path) => Promise.resolve(path === "src/a.ts" ? file : path === "src/context.ts" ? atHead : null),
      changedFiles: () => Promise.resolve([]),
    }
    const body = doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: ["Added it."],
            waypoints: [
              {
                id: "g",
                title: "Added the guard",
                reading: "It refuses.",
                code: { kind: "ref", lang: "ts", path: "src/context.ts", target: { symbol: "target" } },
              },
            ],
          },
        ],
      },
    })
    const out = await writeDocument(body, "walkthrough", both, null, {
      main: { at: mainSha, readFile: (path) => Promise.resolve(path === "src/context.ts" ? onMain : null) },
    })
    expect(out.ok, out.ok ? "" : out.message).toBe(true)
    if (!out.ok) return
    const stored = JSON.parse(out.stored) as Record<string, any>
    const code = stored["codeWalkthrough"].files[0].waypoints[0].code
    expect(code.focus).toEqual({ from: 4, to: 6 })
    expect(code.expect).toBe("export function target(): number {")
    expect(stored["sources"]["src/context.ts"].at).toBe(mainSha)
  })

  it("should resolve a symbol in a Python file", async () => {
    const python = ["class Basket:", "    @property", "    def total(self):", "        return 0", ""].join("\n")
    const both: Repository = {
      head,
      readFile: (path) => Promise.resolve(path === "src/a.ts" ? file : path === "checkout/basket.py" ? python : null),
      changedFiles: () => Promise.resolve([]),
    }
    const body = doc({
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: ["Added it."],
            waypoints: [
              {
                id: "g",
                title: "Added the total",
                reading: "It sums.",
                code: { kind: "ref", lang: "py", path: "checkout/basket.py", target: { symbol: "total" } },
              },
            ],
          },
        ],
      },
    })
    const out = await writeDocument(body, "walkthrough", both, null)
    expect(out.ok, out.ok ? "" : out.message).toBe(true)
    if (!out.ok) return
    const stored = JSON.parse(out.stored) as Record<string, any>
    expect(stored["codeWalkthrough"].files[0].waypoints[0].code.focus).toEqual({ from: 2, to: 4 })
  })
})
