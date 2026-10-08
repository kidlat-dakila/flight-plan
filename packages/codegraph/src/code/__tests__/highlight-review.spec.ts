import { createArtifact, createDeclarationNode, createFinding, createSegment, createWaypoint, PRICE_PATH } from "@/__tests__/review-fixture"
import { highlightReview, tracedLineTokenKeyOf } from "@/code/highlight-review"
import type { CodeHighlighter } from "@/code/highlighter"

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
        intro: null,
        files: [
          {
            path: PRICE_PATH,
            title: "Price file",
            summary: [],
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

  it("highlights each traced line of the nodes of a journey once, in the language of its file", async () => {
    const journey = {
      id: "flow",
      title: "Price",
      nodes: [
        createDeclarationNode("price", {
          tracedLines: [
            { line: 2, text: "if (held) {", isChanged: false },
            { line: 3, text: "return 0", isChanged: true },
          ],
        }),
        createDeclarationNode("total", { tracedLines: [{ line: 9, text: "return priceOf(line)", isChanged: false }, { line: 3, text: "return 0", isChanged: false }] }),
      ],
      edges: [
        {
          from: "total",
          to: "price",
          kind: "call" as const,
          certainty: "proven" as const,
          through: [],
          condition: null,
        },
      ],
    }
    const { tracedLineTokens } = await highlightReview(createArtifact({ segments: [createSegment({ journey })] }), highlightWithLanguage)

    expect([...tracedLineTokens.keys()]).toStrictEqual([
      tracedLineTokenKeyOf(PRICE_PATH, "if (held) {"),
      tracedLineTokenKeyOf(PRICE_PATH, "return 0"),
      tracedLineTokenKeyOf(PRICE_PATH, "return priceOf(line)"),
    ])
    expect(tracedLineTokens.get(tracedLineTokenKeyOf(PRICE_PATH, "return 0"))).toStrictEqual([{ text: "typescript:return 0", kind: "plain" }])
  })
})
