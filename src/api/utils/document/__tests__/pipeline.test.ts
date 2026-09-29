import { describe, expect, it } from "vitest"
import { checkDocument } from "../check"
import { resolve } from "../resolve"
import { documentInput } from "../../../../lib/schemas/document/schema"
import { hunk, storedDocument, type StoredFence } from "../../../../lib/schemas/document/stored"

/**
 * The format reference's worked example, end to end.
 *
 * Parse, resolve, validate against the stored schema, check. Each piece has its
 * own unit tests; this is the one that would notice them disagreeing, and it is
 * the example the format reference teaches from — so if this stops passing, the
 * documentation is wrong and not merely the code.
 */

const head = "4a12380000000000000000000000000000000000"

/** `src/checkout/hasStock.ts` as the worked example draws it, lines 144-163. */
const stock = [
  ...Array.from({ length: 143 }, (_, i) => `// filler ${String(i + 1)}`),
  "/** Whether a basket can be filled. */",
  "export async function hasStock(",
  "  basket: BasketLine[],",
  "): Promise<StockResult> {",
  "  const ids = basket.map((line) => line.productId)",
  "  const levels = await levelsFor(ids)",
  "  const held = await heldFor(ids)",
  "",
  "  const short = basket.filter((line) => {",
  "    const level = levels.get(line.productId) ?? 0",
  "    const reserved = held.get(line.productId) ?? 0",
  "    const available = level - reserved",
  "    return available < line.quantity",
  "  })",
  "",
  "  if (short.length > 0) {",
  "    return { ok: false, short: short.map(describe) }",
  "  }",
  "  return { ok: true, short: [] }",
  "}",
].join("\n")

const authored = {
  schema: 1,
  meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 412 }, head },
  title: "Check every basket line against one stock read",
  contextBody: {
    context:
      "A customer with two products out of stock had to try twice. Checkout now looks at every line and refuses once.",
    overview: [
      {
        when: "a customer submits a basket with two lines out of stock",
        then: "the refusal names both lines.",
      },
      { when: "every line is in stock", then: "nothing changes." },
    ],
    implementation: [
      {
        label: "src/checkout/hasStock.ts",
        path: "src/checkout/hasStock.ts",
        items: [
          {
            text: "Modified [`hasStock()`](code:src/checkout/hasStock.ts#L145-163) to collect every short line.",
          },
        ],
      },
    ],
  },
  diagram: { absent: "One function changed; there is no flow to draw." },
  codeWalkthrough: {
    note: "The guard, then the blocks inside it.",
    files: [
      {
        path: "src/checkout/hasStock.ts",
        summary: ["Modified `hasStock()` to collect every short line."],
        waypoints: [
          {
            id: "stock-guard",
            title: "Modified `hasStock()` to check every line against one stock read",
            reading:
              "`hasStock()` takes a basket and answers whether the order can be filled. It returns every line that falls short, not the first.",
            code: {
              kind: "ref",
              lang: "ts",
              path: "src/checkout/hasStock.ts",
              target: { focus: [145, 163] },
            },
            children: [
              {
                id: "read-levels",
                title: "Read the level for every line in one query",
                reading: "One call replaces one call per line.",
                code: {
                  kind: "ref",
                  lang: "ts",
                  path: "src/checkout/hasStock.ts",
                  target: { focus: [145, 163] },
                  covers: [0],
                },
              },
              {
                id: "compare-reserved",
                title: "Compared each line against what is reserved",
                reading: "The filter keeps every short line.",
                code: {
                  kind: "ref",
                  lang: "ts",
                  path: "src/checkout/hasStock.ts",
                  target: { focus: [145, 163] },
                  covers: [1],
                },
              },
              {
                id: "answer-short",
                title: "Answered with the lines that are short",
                reading: "The return carries the short lines with the refusal.",
                code: {
                  kind: "ref",
                  lang: "ts",
                  path: "src/checkout/hasStock.ts",
                  target: { focus: [145, 163] },
                  covers: [2],
                },
              },
            ],
          },
        ],
      },
    ],
  },
}

/**
 * Where `hasStock` is, as a language server would say.
 *
 * The implementation list links to it by name, and that link is checked when
 * the document is written -- which is the point of writing it as a link rather
 * than as a sentence describing the same function.
 */
const symbols = (_path: string, name: string) =>
  Promise.resolve(name === "hasStock" ? { from: 145, to: 163 } : null)

/** The hunks the worked example implies: 148-150, 152-157, 159-161. */
const hunks = {
  "src/checkout/hasStock.ts": hunk.parse({
    added: [
      [148, 150],
      [152, 157],
      [159, 161],
    ],
    removed: [
      {
        after: 147,
        lines: [
          "  for (const line of basket) {",
          "    const level = await levelFor(line.productId)",
          "  }",
        ],
      },
    ],
  }),
}

describe("the format reference's worked example", () => {
  it("should parse, resolve, validate and check", async () => {
    const input = documentInput.parse(authored)

    const out = await resolve(input, {
      at: head,
      readFile: (path) =>
        Promise.resolve(path === "src/checkout/hasStock.ts" ? stock : null),
      hunks,
      findSymbol: symbols,
    })
    expect(out.ok).toBe(true)
    if (!out.ok) return

    // The resolver's output is a document the stored schema accepts.
    expect(storedDocument.safeParse(out.document).success).toBe(true)

    // And one nothing complains about.
    expect(checkDocument(out.document)).toEqual([])
  })

  it("should give each child the mark its covers named", async () => {
    const out = await resolve(documentInput.parse(authored), {
      at: head,
      readFile: () => Promise.resolve(stock),
      hunks,
      findSymbol: symbols,
    })
    if (!out.ok) throw new Error("expected resolution to succeed")

    const kids = out.document.codeWalkthrough.files[0]?.waypoints[0]?.children ?? []
    expect(kids.map((k) => k.code?.marks)).toEqual([
      [{ from: 148, to: 150 }],
      [{ from: 152, to: 157 }],
      [{ from: 159, to: 161 }],
    ])
  })

  it("should give every child the parent's range, not its own block", async () => {
    // The rule that makes a breakdown work: the panel does not re-window as
    // the reader moves down the children, so the function stays put and only
    // the highlight moves.
    const out = await resolve(documentInput.parse(authored), {
      at: head,
      readFile: () => Promise.resolve(stock),
      hunks,
      findSymbol: symbols,
    })
    if (!out.ok) throw new Error("expected resolution to succeed")

    const parent = out.document.codeWalkthrough.files[0]?.waypoints[0]
    const focusOf = (code: StoredFence | null | undefined) =>
      code?.kind === "ref" ? code.focus : null
    for (const kid of parent?.children ?? []) {
      expect(focusOf(kid.code)).toEqual(focusOf(parent?.code))
    }
    expect(focusOf(parent?.code)).toEqual({ from: 145, to: 163 })
  })

  it("should capture the function signature as the repair text", async () => {
    const out = await resolve(documentInput.parse(authored), {
      at: head,
      readFile: () => Promise.resolve(stock),
      hunks,
      findSymbol: symbols,
    })
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect(out.document.codeWalkthrough.files[0]?.waypoints[0]?.code).toMatchObject({
      expect: "export async function hasStock(",
    })
  })

  it("should carry the removed lines into the sources map", async () => {
    // The capability the Markdown format could not have: the old per-line loop
    // is still in the document, ready to draw beneath the line it used to sit
    // on.
    const out = await resolve(documentInput.parse(authored), {
      at: head,
      readFile: () => Promise.resolve(stock),
      hunks,
      findSymbol: symbols,
    })
    if (!out.ok) throw new Error("expected resolution to succeed")
    expect(out.document.sources["src/checkout/hasStock.ts"]?.hunks?.removed).toEqual([
      {
        after: 147,
        lines: [
          "  for (const line of basket) {",
          "    const level = await levelFor(line.productId)",
          "  }",
        ],
      },
    ])
  })
})
