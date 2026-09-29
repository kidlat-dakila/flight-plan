import { describe, expect, it } from "vitest"
import { documentInput } from "../../../../lib/schemas/document/schema"
import { resolve } from "../resolve"
import { toInput } from "../toInput"
import { storedDocument } from "../../../../lib/schemas/document/stored"

const head = "4a12380000000000000000000000000000000000"
const file = ["export function f() {", "  return 1", "}"].join("\n")

const authored = {
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
            reading: "x",
            code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { focus: [1, 3] } },
            children: [
              {
                id: "a",
                title: "A",
                reading: "x",
                code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { focus: [1, 3] } },
              },
              {
                id: "b",
                title: "B",
                reading: "x",
                code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { focus: [1, 3] } },
              },
            ],
          },
        ],
      },
    ],
  },
}

const source = {
  at: head,
  readFile: () => Promise.resolve(file),
  hunks: {},
  findSymbol: null,
}

describe("toInput", () => {
  it("should strip what resolution added", async () => {
    const out = await resolve(documentInput.parse(authored), source)
    if (!out.ok) throw new Error("expected resolution to succeed")

    const back = toInput(out.document)
    const code = back.codeWalkthrough.files[0]?.waypoints[0]?.code as Record<string, unknown>
    expect(code["focus"]).toBeUndefined()
    expect(code["expect"]).toBeUndefined()
    expect((back as Record<string, unknown>)["sources"]).toBeUndefined()
    // And keeps what the author wrote.
    expect(code["target"]).toEqual({ focus: { from: 1, to: 3 } })
  })

  it("should round-trip through the schema it came from", async () => {
    // The property that makes amendment possible: resolve, strip, re-resolve.
    const first = await resolve(documentInput.parse(authored), source)
    if (!first.ok) throw new Error("expected resolution to succeed")

    const again = await resolve(documentInput.parse(toInput(first.document)), source)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.document).toEqual(first.document)
    expect(storedDocument.safeParse(again.document).success).toBe(true)
  })

  it("should keep a document finding's solution", async () => {
    const withFinding = {
      ...authored,
      findings: [
        {
          id: "f1",
          kind: "bug",
          title: "It returns one",
          reading: "It should return two.",
          code: { kind: "ref", lang: "ts", path: "src/a.ts", target: { focus: [2, 2] } },
          solution: { lang: "ts", body: "  return 2" },
        },
      ],
    }
    const out = await resolve(documentInput.parse(withFinding), source)
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect(toInput(out.document).findings?.[0]?.solution).toEqual({ lang: "ts", body: "  return 2" })
  })

  it("should keep nested waypoints", async () => {
    const out = await resolve(documentInput.parse(authored), source)
    if (!out.ok) throw new Error("expected resolution to succeed")
    const kids = toInput(out.document).codeWalkthrough.files[0]?.waypoints[0]?.children
    expect(kids?.map((k) => k.id)).toEqual(["a", "b"])
  })

  it("should re-resolve a symbol rather than reusing the range it had", async () => {
    // A symbol that moved must resolve to where it is now. Keeping the old
    // focus would make the name decorative.
    const withSymbol = {
      ...authored,
      codeWalkthrough: {
        files: [
          {
            path: "src/a.ts",
            summary: [],
            waypoints: [
              {
                id: "g",
                title: "Added it",
                reading: "x",
                code: {
                  kind: "ref",
                  lang: "ts",
                  path: "src/a.ts",
                  target: { symbol: "f" },
                },
              },
            ],
          },
        ],
      },
    }
    const first = await resolve(documentInput.parse(withSymbol), {
      ...source,
      findSymbol: () => Promise.resolve({ from: 1, to: 3 }),
    })
    if (!first.ok) throw new Error("expected resolution to succeed")

    // The file changed; the declaration is lower now.
    const moved = await resolve(documentInput.parse(toInput(first.document)), {
      ...source,
      readFile: () => Promise.resolve(["", "", ...file.split("\n")].join("\n")),
      findSymbol: () => Promise.resolve({ from: 3, to: 5 }),
    })
    if (!moved.ok) throw new Error("expected resolution to succeed")
    const code = moved.document.codeWalkthrough.files[0]?.waypoints[0]?.code
    expect(code).toMatchObject({ focus: { from: 3, to: 5 } })
  })
})

/*
 * The mapping is explicit, so a field that is not named here is not refused —
 * it is dropped. The blast radius was written by the scaffold and lost on the
 * first write after it, which left a document indistinguishable from one the
 * walk had never run on.
 */
describe("toInput and the blast radius", () => {
  const withBlast = {
    ...authored,
    blast: {
      type: "blast",
      seed: { diff: { base: "b".repeat(40), head } },
      nodes: [
        {
          id: "src/a.ts:1",
          label: "f",
          path: "src/a.ts",
          lines: [1, 3],
          hop: 0,
          changed: true,
          contract: { before: "returned void", now: "returns the row count" },
        },
      ],
      edges: [],
    },
  }

  it("should carry the board through an amend", async () => {
    const out = await resolve(documentInput.parse(withBlast), source)
    if (!out.ok) throw new Error("expected resolution to succeed")

    const back = toInput(out.document) as Record<string, unknown>
    expect(back["blast"]).toBeDefined()
    expect((back["blast"] as { nodes: unknown[] }).nodes).toHaveLength(1)
  })

  it("should survive resolve, strip and re-resolve unchanged", async () => {
    const first = await resolve(documentInput.parse(withBlast), source)
    if (!first.ok) throw new Error("expected resolution to succeed")

    const again = await resolve(documentInput.parse(toInput(first.document)), source)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.document).toEqual(first.document)
  })

  it("should leave a document that never had one without the field", async () => {
    const out = await resolve(documentInput.parse(authored), source)
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect((toInput(out.document) as Record<string, unknown>)["blast"]).toBeUndefined()
  })
})
