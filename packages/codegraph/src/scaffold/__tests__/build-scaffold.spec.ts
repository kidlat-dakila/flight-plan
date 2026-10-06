import { buildScaffold, languageOf, type ChangeSnapshot } from "@/scaffold/build-scaffold"

const PRICE_TEXT = ["const CENTS = 100", "", "export const priceOf = (sku: string, held = 0) =>", "  rates[sku] - held", ""].join("\n")

const createChange = (overrides: Partial<ChangeSnapshot> = {}): ChangeSnapshot => ({
  title: "Count held units",
  headCommit: "abc1234",
  hunks: {
    "src/price.ts": {
      added: [{ lineStart: 3, lineEnd: 4 }],
      removed: [{ afterLine: 2, lines: ["export const priceOf = (sku: string) => rates[sku]"] }],
      isCreated: false,
    },
    "src/__tests__/price.spec.ts": { added: [{ lineStart: 1, lineEnd: 3 }], removed: [], isCreated: true },
    "README": { added: [{ lineStart: 2, lineEnd: 2 }], removed: [], isCreated: false },
  },
  texts: new Map([
    ["src/price.ts", PRICE_TEXT],
    ["src/__tests__/price.spec.ts", "it(\"works\", () => {\n  expect(1).toBe(1)\n})\n"],
    ["README", "Storefront\nNow counts held units.\n"],
  ]),
  ...overrides,
})

describe("buildScaffold", () => {
  it("builds a drafting artifact with one segment that names every changed file", () => {
    expect(buildScaffold(createChange())).toMatchObject({
      title: "Count held units",
      status: "drafting",
      commit: "abc1234",
      isSegmented: false,
      changedPaths: ["README", "src/__tests__/price.spec.ts", "src/price.ts"],
      segments: [
        {
          id: "all",
          changedPaths: ["README", "src/__tests__/price.spec.ts", "src/price.ts"],
          context: "",
          journey: null,
          journeyAbsence: "The Journey Flow Diagram is not built yet.",
          blast: null,
          blastAbsence: "The Blast Diagram is not built yet.",
        },
      ],
    })
  })

  it("tours the changed files that are not tests, each with its waypoints and its resolved source", () => {
    const artifact = buildScaffold(createChange())

    expect(artifact.segments.flatMap((segment) => segment.walkthrough.files)).toMatchObject([
      { path: "README", waypoints: [{ id: "w1", declaration: "Lines 2–2" }] },
      { path: "src/price.ts", waypoints: [{ id: "w2", declaration: "priceOf", title: null }] },
    ])
    expect(artifact.sources).toMatchObject([
      { path: "README", language: "text", declarations: { "Lines 2–2": { lineStart: 2, lineEnd: 2 } } },
      {
        path: "src/price.ts",
        language: "typescript",
        declarations: { priceOf: { lineStart: 3, lineEnd: 4 } },
        lines: [
          { text: "const CENTS = 100", mark: "context", number: 1 },
          { text: "", mark: "context", number: 2 },
          { text: "export const priceOf = (sku: string) => rates[sku]", mark: "removed", number: null },
          { text: "export const priceOf = (sku: string, held = 0) =>", mark: "added", number: 3 },
          { text: "  rates[sku] - held", mark: "added", number: 4 },
        ],
      },
    ])
  })

  it("tours the tests when the change touches nothing else", () => {
    const hunks = { "src/__tests__/price.spec.ts": { added: [{ lineStart: 1, lineEnd: 1 }], removed: [], isCreated: false } }

    expect(buildScaffold(createChange({ hunks })).sources.map((source) => source.path)).toStrictEqual([
      "src/__tests__/price.spec.ts",
    ])
  })

  it("anchors a file whose text cannot be read to its changed lines", () => {
    const artifact = buildScaffold(createChange({ texts: new Map() }))

    expect(artifact.sources.find((source) => source.path === "src/price.ts")).toMatchObject({
      declarations: { "Lines 3–4": { lineStart: 3, lineEnd: 4 } },
      lines: [{ mark: "removed" }],
    })
  })
})

describe("languageOf", () => {
  it("names the language the highlighter knows for a path", () => {
    expect(languageOf("src/a.ts")).toBe("typescript")
    expect(languageOf("src/A.tsx")).toBe("tsx")
    expect(languageOf("tool.py")).toBe("python")
    expect(languageOf("Makefile")).toBe("text")
    expect(languageOf(".gitignore")).toBe("text")
  })
})
