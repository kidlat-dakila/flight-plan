import { createArtifact, createFinding, createSegment, createWaypoint, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { highlightReview } from "@/code/highlight-review"
import type { CodeHighlighter } from "@/code/highlighter"
import { usageLineKeyOf } from "@/code/lines"

const highlightWithLanguage: CodeHighlighter = async (lines, language) =>
  await Promise.resolve(lines.map((text) => [{ text: `${language}:${text}`, kind: "plain" as const }]))

describe("highlightReview", () => {
  it("highlights every source in its language, line for line", async () => {
    const artifact = createArtifact()
    const { sources } = await highlightReview(artifact, highlightWithLanguage)

    expect(sources.map((highlighted) => highlighted.tokenLines.length)).toStrictEqual(
      artifact.sources.map((source) => source.lines.length),
    )
    expect(sources[1].tokenLines[0]).toStrictEqual([
      { text: "typescript:export const subtotal = (skus: string[]) =>", kind: "plain" },
    ])
  })

  it("highlights each finding's fix in the language of the file it is about", async () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          {
            path: PRICE_PATH,
            waypoints: [
              createWaypoint("w", "priceOf", {
                children: [createWaypoint("c", "format", { findings: [createFinding("nested", "nit", { solution: "a\nb" })] })],
              }),
            ],
          },
        ],
      },
    })
    const { solutionTokens } = await highlightReview(createArtifact({ segments: [segment] }), highlightWithLanguage)

    expect(solutionTokens.get("nested")).toStrictEqual([
      [{ text: "typescript:a", kind: "plain" }],
      [{ text: "typescript:b", kind: "plain" }],
    ])
  })

  it("highlights the line of each usage of an export in the language of the file that uses it", async () => {
    const usages = [
      { line: 4, startColumn: 16, endColumn: 23, path: "src/checkout.tsx", text: "const total = priceOf(sku)" },
      { line: 4, startColumn: 30, endColumn: 37, path: "src/checkout.tsx", text: "const total = priceOf(sku)" },
      { line: 2, startColumn: 0, endColumn: 7, path: "scripts/report.py", text: "priceOf(sku)" },
    ]
    const exporting = { ...priceSource, exports: [{ line: 11, startColumn: 13, endColumn: 20, lines: [11, 12] as [number, number], usages }] }
    const { sources } = await highlightReview(createArtifact({ sources: [exporting] }), highlightWithLanguage)

    expect([...sources[0].usageTokenLines]).toStrictEqual([
      [usageLineKeyOf(usages[0]), [{ text: "tsx:const total = priceOf(sku)", kind: "plain" }]],
      [usageLineKeyOf(usages[2]), [{ text: "python:priceOf(sku)", kind: "plain" }]],
    ])
  })
})
