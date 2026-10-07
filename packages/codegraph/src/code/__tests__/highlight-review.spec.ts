import { createArtifact, createDeclarationNode, createFinding, createSegment, createWaypoint, PRICE_PATH } from "@/__tests__/review-fixture"
import { highlightReview, frameTokenKeyOf } from "@/code/highlight-review"
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

  it("highlights each line of the frames of a journey, of its nodes and of its edges, in the language of its file", async () => {
    const journey = {
      id: "flow",
      title: "Price",
      nodes: [
        createDeclarationNode("price", {
          frameLines: [
            { line: 2, text: "if (held) {", isChanged: false },
            { line: 3, text: "return 0", isChanged: true },
          ],
        }),
        createDeclarationNode("total"),
      ],
      edges: [
        {
          from: "total",
          to: "price",
          kind: "call" as const,
          certainty: "proven" as const,
          through: [],
          condition: null,
          frameLines: [{ line: 9, text: "return priceOf(line)", isChanged: false }, { line: 3, text: "return 0", isChanged: false }],
        },
      ],
    }
    const { frameTokens } = await highlightReview(createArtifact({ segments: [createSegment({ journey })] }), highlightWithLanguage)

    expect([...frameTokens.keys()]).toStrictEqual([
      frameTokenKeyOf(PRICE_PATH, "if (held) {"),
      frameTokenKeyOf(PRICE_PATH, "return 0"),
      frameTokenKeyOf(PRICE_PATH, "return priceOf(line)"),
    ])
    expect(frameTokens.get(frameTokenKeyOf(PRICE_PATH, "return 0"))).toStrictEqual([{ text: "typescript:return 0", kind: "plain" }])
  })
})
