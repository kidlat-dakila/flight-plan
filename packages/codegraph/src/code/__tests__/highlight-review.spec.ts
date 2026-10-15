import { createArtifact, createFinding, createSegment, createWaypoint, PRICE_PATH } from "@/__tests__/review-fixture"
import { highlightReview } from "@/code/highlight-review"
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
})
