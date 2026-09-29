import { describe, expect, it } from "vitest"
import { amendDocument, stillDrafting } from "../amend"
import { writeDocument } from "../document"
import type { Repository } from "../repository"

const head = "4a12380000000000000000000000000000000000"
const file = ["export function f() {", "  return 1", "}"].join("\n")

const tree: Repository = {
  head,
  readFile: () => Promise.resolve(file),
  changedFiles: () => Promise.resolve([]),
}

const quiet = { findSymbol: null }

/** What an opening stores before the scaffold: a title, a context, and nothing else. */
async function begin(): Promise<string> {
  const out = await writeDocument(
    JSON.stringify({
      schema: 1,
      meta: {
        kind: "walkthrough",
        repo: "acme/storefront",
        at: { pr: 1 },
        head,
        status: "drafting",
      },
      title: "Check the basket",
      contextBody: { context: "Checkout refuses once." },
      diagram: { absent: "Not drawn yet." },
      codeWalkthrough: { files: [] },
    }),
    "walkthrough",
    tree,
    null,
    quiet,
  )
  if (!out.ok) throw new Error(out.message)
  return out.stored
}

import type { Waypoint } from "../../../lib/schemas/document/schema"

const waypoint: Waypoint = {
  id: "g",
  title: "Added the guard",
  reading: "It refuses.",
  code: {
    kind: "ref",
    lang: "ts",
    path: "src/a.ts",
    target: { focus: { from: 1, to: 3 } },
  },
}

describe("building a walkthrough in pieces", () => {
  it("should store a document that has only a context section", async () => {
    // The first thing a reader sees, and the whole reason for building in
    // pieces: it exists after one call instead of after all of them.
    const stored = JSON.parse(await begin()) as Record<string, any>
    expect(stored["meta"].status).toBe("drafting")
    expect(stored["contextBody"].context).toBe("Checkout refuses once.")
    expect(stored["codeWalkthrough"].files).toEqual([])
  })

  it("should refuse to call that document finished", async () => {
    const out = await amendDocument(
      await begin(),
      "walkthrough",
      (d) => ({ ...d, meta: { ...d.meta, status: "complete" } }),
      tree,
      null,
      quiet,
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("not finished")
    expect(out.message).toContain("overview")
    // And says the reader keeps what is already there.
    expect(out.message).toContain("untouched")
  })

  it("should add a file section to what is already stored", async () => {
    const out = await amendDocument(
      await begin(),
      "walkthrough",
      (d) =>
        stillDrafting({
          ...d,
          codeWalkthrough: {
            ...d.codeWalkthrough,
            files: [{ path: "src/a.ts", summary: ["Added it."], waypoints: [waypoint] }],
          },
        }),
      tree,
      null,
      quiet,
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const stored = JSON.parse(out.stored) as Record<string, any>
    expect(stored["codeWalkthrough"].files[0].waypoints[0].id).toBe("g")
    // Still being written, because adding a piece is not finishing.
    expect(stored["meta"].status).toBe("drafting")
    // And resolved, exactly as a whole-body write would have been.
    expect(stored["codeWalkthrough"].files[0].waypoints[0].code.expect).toBe(
      "export function f() {",
    )
  })

  it("should check a piece when it lands, not at the end", async () => {
    // A broken reference is reported on the call that introduced it, while the
    // agent still has that waypoint in hand.
    const out = await amendDocument(
      await begin(),
      "walkthrough",
      (d) =>
        stillDrafting({
          ...d,
          codeWalkthrough: {
            ...d.codeWalkthrough,
            files: [
              {
                path: "src/a.ts",
                summary: [],
                waypoints: [
                  {
                    ...waypoint,
                    code: {
                      kind: "ref" as const,
                      lang: "ts",
                      path: "src/a.ts",
                      target: { focus: { from: 1, to: 99 } },
                    },
                  },
                ],
              },
            ],
          },
        }),
      tree,
      null,
      quiet,
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("past the end")
  })

  it("should finish once every section is there", async () => {
    let document = await begin()

    const step = async (change: Parameters<typeof amendDocument>[2], complete = false) => {
      void complete
      const out = await amendDocument(document, "walkthrough", change, tree, null, quiet)
      if (!out.ok) throw new Error(out.message)
      document = out.stored
      return out
    }

    await step((d) =>
      stillDrafting({
        ...d,
        contextBody: {
          ...d.contextBody,
          overview: [{ when: "a line is short", then: "it says so." }],
        },
      }),
    )
    await step((d) =>
      stillDrafting({
        ...d,
        contextBody: {
          ...d.contextBody,
          implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
        },
      }),
    )
    await step((d) =>
      stillDrafting({
        ...d,
        codeWalkthrough: {
          ...d.codeWalkthrough,
          files: [{ path: "src/a.ts", summary: ["Added it."], waypoints: [waypoint] }],
        },
      }),
    )

    const done = await step(
      (d) => ({ ...d, meta: { ...d.meta, status: "complete" } }),
      true,
    )
    expect(done.ok).toBe(true)
    const stored = JSON.parse(document) as Record<string, any>
    expect(stored["meta"].status).toBe("complete")
    // Every section is there, which is only checkable once the tour exists.
    expect(stored["contextBody"].overview).toHaveLength(1)
    expect(stored["codeWalkthrough"].files[0].waypoints[0].id).toBe("g")
  })

  it("should refuse to amend a document that is not JSON", async () => {
    const out = await amendDocument(
      "# A walkthrough\n\n### !!steps A waypoint\n",
      "walkthrough",
      (d) => d,
      tree,
      null,
      quiet,
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("not valid JSON")
  })
})

describe("building a plan in pieces", () => {
  it("should refuse to finish a plan that has no tour", async () => {
    const opening = JSON.stringify({
      schema: 1,
      meta: { kind: "plan", repo: "acme/storefront", name: "stock", status: "drafting" },
      title: "Check every basket line",
      contextBody: { context: "Checkout will refuse once." },
      diagram: { absent: "Not drawn yet." },
      codeWalkthrough: { files: [] },
    })
    const begun = await writeDocument(opening, "plan", tree, null, quiet)
    if (!begun.ok) throw new Error(begun.message)

    const out = await amendDocument(
      begun.stored,
      "plan",
      (d) => ({ ...d, meta: { ...d.meta, status: "complete" } }),
      tree,
      null,
      quiet,
    )
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.message).toContain("at least one file section")
  })

  it("should finish a plan once it proposes something", async () => {
    let document = ""
    const begun = await writeDocument(
      JSON.stringify({
        schema: 1,
        meta: { kind: "plan", repo: "acme/storefront", name: "stock", status: "drafting" },
        title: "Check every basket line",
        contextBody: {
          context: "Checkout will refuse once.",
          overview: [{ when: "a line is short", then: "it will say so." }],
          implementation: [{ label: "src/a.ts", items: [{ text: "Add the guard." }] }],
        },
        diagram: { absent: "One function; no flow to draw." },
        codeWalkthrough: {
          files: [
            {
              path: "src/a.ts",
              summary: ["Add the guard."],
              waypoints: [
                {
                  id: "guard",
                  title: "Add the guard",
                  reading: "Put it above the return.",
                  code: {
                    kind: "proposal",
                    lang: "ts",
                    path: "src/a.ts",
                    position: { kind: "after", line: 2 },
                    body: "  if (!ok) return false",
                  },
                },
              ],
            },
          ],
        },
      }),
      "plan",
      tree,
      null,
      quiet,
    )
    if (!begun.ok) throw new Error(begun.message)
    document = begun.stored

    const done = await amendDocument(
      document,
      "plan",
      (d) => ({ ...d, meta: { ...d.meta, status: "complete" } }),
      tree,
      null,
      quiet,
    )
    expect(done.ok).toBe(true)
    if (!done.ok) return
    expect((JSON.parse(done.stored) as Record<string, any>)["meta"].status).toBe("complete")
  })

})
