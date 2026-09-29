import { describe, expect, it } from "vitest"
import {
  contextBody,
  documentInput,
  fence,
  meta,
  waypoint,
} from "../schema"

const head = "4a12380000000000000000000000000000000000"

describe("meta", () => {
  it("should read a walkthrough for a pull request", () => {
    const parsed = meta.parse({
      kind: "walkthrough",
      repo: "acme/storefront",
      at: { pr: 412 },
      head,
    })
    expect(parsed).toMatchObject({ kind: "walkthrough", at: { pr: 412 } })
  })

  it("should read a walkthrough filed under a branch", () => {
    // Somebody reviewing with plain git has no pull request to name.
    const parsed = meta.parse({
      kind: "walkthrough",
      repo: "acme/storefront",
      at: { branch: "stock-guard" },
      head,
    })
    expect(parsed).toMatchObject({ at: { branch: "stock-guard" } })
  })

  it("should refuse a walkthrough with no head", () => {
    // Without it every reference is read at the wrong commit and staleness
    // stops working, both silently. This is the check that earns the union.
    const parsed = meta.safeParse({
      kind: "walkthrough",
      repo: "acme/storefront",
      at: { pr: 1 },
    })
    expect(parsed.success).toBe(false)
  })

  it("should refuse a head on a plan", () => {
    // A plan splices into the working tree. A commit would freeze it against a
    // snapshot that stops matching the moment the reader starts typing.
    const parsed = meta.safeParse({
      kind: "plan",
      repo: "acme/storefront",
      name: "stock-guard",
      head,
    })
    expect(parsed.success).toBe(false)
  })

  it("should refuse a wiki page, which is no longer a kind", () => {
    expect(
      meta.safeParse({ kind: "wiki", repo: "acme/storefront", path: "src/a.ts" }).success,
    ).toBe(false)
  })
})

describe("contextBody", () => {
  const scenario = { when: "a line is short", then: "the order is refused." }
  const group = { label: "src/a.ts", items: [{ text: "Added a guard." }] }

  it("should read a full context body", () => {
    const parsed = contextBody.parse({
      context: "Checkout refuses once instead of twice.",
      overview: [scenario],
      implementation: [group],
    })
    expect(parsed.overview?.[0]?.then).toBe("the order is refused.")
  })

  it("should refuse a scenario carrying the old see field", () => {
    // `see` named the waypoint that produced an outcome. The text names the
    // code instead, with a link that is checked against the repository, so a
    // leftover `see` is a document written against the older shape.
    const parsed = contextBody.safeParse({
      context: "x",
      overview: [{ when: "a", then: "b", see: ["g"] }],
      implementation: [group],
    })
    expect(parsed.success).toBe(false)
  })

  it("should take a scenario whose outcome names the code", () => {
    const parsed = contextBody.parse({
      context: "x",
      overview: [
        {
          when: "a line is short",
          then: "the refusal names it, from [`hasStock()`](code:src/a.ts#hasStock).",
        },
      ],
      implementation: [group],
    })
    expect(parsed.overview?.[0]?.then).toContain("code:src/a.ts#hasStock")
  })

  it("should refuse a scenario with no outcome", () => {
    const parsed = contextBody.safeParse({
      context: "x",
      overview: [{ when: "a line is short" }],
      implementation: [group],
    })
    expect(parsed.success).toBe(false)
  })

  it("should refuse a group with no items", () => {
    // A group is a place, and a place with nothing in it says nothing.
    const parsed = contextBody.safeParse({
      context: "x",
      overview: [scenario],
      implementation: [{ label: "src/a.ts", items: [] }],
    })
    expect(parsed.success).toBe(false)
  })
})

const refFence = {
  kind: "ref" as const,
  lang: "ts",
  path: "src/checkout/hasStock.ts",
  target: { symbol: "hasStock" },
}

const leaf = (id: string) => ({
  id,
  title: `Did something to ${id}`,
  reading: "It does the thing.",
  code: refFence,
})

describe("fence", () => {
  it("should read a reference naming a symbol", () => {
    expect(fence.parse(refFence)).toMatchObject({ target: { symbol: "hasStock" } })
  })

  it("should read covers as hunk indices", () => {
    expect(fence.parse({ ...refFence, covers: [0, 2] })).toMatchObject({
      covers: [0, 2],
    })
  })

  it("should refuse marks on a reference", () => {
    // Derived from the diff. A hand-written one is a second source of truth
    // for one fact, and it is the half that goes stale.
    expect(fence.safeParse({ ...refFence, marks: [[1, 2]] }).success).toBe(false)
  })

  it("should read a proposal with a position and a body", () => {
    const parsed = fence.parse({
      kind: "proposal",
      lang: "ts",
      path: "src/checkout/hasStock.ts",
      position: { kind: "replace", lines: [155, 155] },
      body: "    const available = level - Math.max(reserved, 0)",
    })
    expect(parsed).toMatchObject({
      position: { kind: "replace", lines: { from: 155, to: 155 } },
    })
  })

  it("should refuse a proposal with an empty body", () => {
    // Someone is going to type it. An empty proposal proposes nothing.
    expect(
      fence.safeParse({
        kind: "proposal",
        lang: "ts",
        path: "a.ts",
        position: { kind: "new" },
        body: "",
      }).success,
    ).toBe(false)
  })

  it("should refuse a target on a proposal", () => {
    // A proposal addresses a position, not a range. Carrying both would be two
    // different claims about where the code goes.
    expect(
      fence.safeParse({
        kind: "proposal",
        lang: "ts",
        path: "a.ts",
        position: { kind: "new" },
        body: "x",
        target: { symbol: "f" },
      }).success,
    ).toBe(false)
  })
})

describe("waypoint", () => {
  it("should read a waypoint with two children", () => {
    const parsed = waypoint.parse({ ...leaf("parent"), children: [leaf("a"), leaf("b")] })
    expect(parsed.children).toHaveLength(2)
  })

  it("should refuse exactly one child", () => {
    // A parent with a single child is a flat waypoint written across two
    // cards: the parent's range is the block, so the child's mark would
    // highlight its whole focus, which highlights nothing.
    const parsed = waypoint.safeParse({ ...leaf("parent"), children: [leaf("a")] })
    expect(parsed.success).toBe(false)
  })

  it("should accept a waypoint with no code", () => {
    // Rare and reported elsewhere as a warning, but it parses: refusing it
    // would cost the whole document over one empty panel.
    expect(waypoint.safeParse({ ...leaf("x"), code: null }).success).toBe(true)
  })

  it("should read nested children three deep", () => {
    // As deep as the code nests: a body, a block, and a block that is itself
    // a body with blocks of its own.
    const parsed = waypoint.parse({
      ...leaf("body"),
      children: [
        leaf("block"),
        { ...leaf("nested-body"), children: [leaf("x"), leaf("y")] },
      ],
    })
    expect(parsed.children?.[1]?.children).toHaveLength(2)
  })
})

describe("documentInput", () => {
  const base = {
    schema: 1,
    meta: { kind: "walkthrough", repo: "acme/storefront", at: { pr: 1 }, head },
    title: "Check every basket line against one stock read",
    contextBody: {
      context: "x",
      overview: [{ when: "a", then: "b" }],
      implementation: [{ label: "src/a.ts", items: [{ text: "Added it." }] }],
    },
    diagram: { absent: "Two edits in one file; no flow to draw." },
    codeWalkthrough: {
      files: [
        { path: "src/checkout/hasStock.ts", summary: ["Added it."], waypoints: [leaf("g")] },
      ],
    },
  }

  it("should read a complete walkthrough", () => {
    expect(documentInput.parse(base).title).toBe(
      "Check every basket line against one stock read",
    )
  })

  it("should accept a walkthrough with no overview yet", () => {
    // A document being written has not got one. The rule that a finished
    // walkthrough needs it moved to `checkComplete`, because enforcing it here
    // would mean nothing could be stored until it was done -- and the point of
    // storing early is that somebody can start reading.
    const { overview: _drop, ...rest } = base.contextBody
    expect(documentInput.safeParse({ ...base, contextBody: rest }).success).toBe(true)
  })

  it("should default a document with no status to complete", () => {
    // Every document written before the field existed was finished when it was
    // stored, so this is what keeps them readable.
    expect(documentInput.parse(base).meta.status).toBe("complete")
  })

  it("should read a document that says it is still being written", () => {
    const drafting = documentInput.parse({
      ...base,
      meta: { ...base.meta, status: "drafting" },
    })
    expect(drafting.meta.status).toBe("drafting")
  })

  it("should accept a walkthrough with no files yet", () => {
    // The first thing stored is a title and a context section, and nothing else.
    const parsed = documentInput.safeParse({
      ...base,
      meta: { ...base.meta, status: "drafting" },
      codeWalkthrough: { files: [] },
    })
    expect(parsed.success).toBe(true)
  })

  it("should read a finding with a kind instead of a badge", () => {
    const parsed = documentInput.parse({
      ...base,
      findings: [
        {
          id: "f1",
          kind: "bug",
          title: "`hasStock()` reads a negative hold as stock",
          reading: "It subtracts without checking the sign.",
          code: refFence,
        },
      ],
    })
    expect(parsed.findings?.[0]?.kind).toBe("bug")
  })

  it("should accept a solution on a document finding, as a replacement for its lines", () => {
    const parsed = documentInput.parse({
      ...base,
      findings: [
        {
          id: "f1",
          kind: "bug",
          title: "`hasStock()` reads a negative hold as stock",
          reading: "It subtracts without checking the sign.",
          code: refFence,
          solution: { lang: "ts", body: "const available = level - Math.max(reserved, 0)" },
        },
      ],
    })
    expect(parsed.findings?.[0]?.solution?.lang).toBe("ts")
  })

  it("should refuse a solution on a question", () => {
    // A question is the reviewer not knowing. A fix attached to one is a
    // suggestion wearing a question's chip.
    expect(
      documentInput.safeParse({
        ...base,
        findings: [
          {
            id: "f1",
            kind: "question",
            title: "Was the cap measured?",
            reading: "The comment gives no reason.",
            code: refFence,
            solution: { lang: "ts", body: "x" },
          },
        ],
      }).success,
    ).toBe(false)
  })

  it("should refuse an empty findings array", () => {
    // A document with nothing to report has no section rather than a section
    // saying so.
    expect(documentInput.safeParse({ ...base, findings: [] }).success).toBe(false)
  })
})
