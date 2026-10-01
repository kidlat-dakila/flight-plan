import { createCodeHighlighter, mergeTokens } from "@/utils/code-highlighter"

describe("mergeTokens", () => {
  it("joins neighbouring tokens of the same kind", () => {
    expect(
      mergeTokens([
        { content: "\"", scopes: ["punctuation.definition.string.begin.ts"] },
        { content: "held", scopes: ["string.quoted.double.ts"] },
        { content: "\"", scopes: ["punctuation.definition.string.end.ts"] },
        { content: " ", scopes: ["source.ts"] },
        { content: "as", scopes: ["keyword.control.as.ts"] },
      ]),
    ).toStrictEqual([
      { kind: "string", text: "\"held\"" },
      { kind: "plain", text: " " },
      { kind: "keyword", text: "as" },
    ])
  })
})

describe("createCodeHighlighter", () => {
  it("returns one token line per line of code, with the text unchanged", async () => {
    const lines = ["export const held = 2", "", "// units"]
    const tokenLines = await createCodeHighlighter()(lines, "typescript")

    expect(tokenLines.map((tokens) => tokens.map((token) => token.text).join(""))).toStrictEqual(lines)
    expect(tokenLines[0].map((token) => token.kind)).toContain("keyword")
    expect(tokenLines[2]).toStrictEqual([{ kind: "comment", text: "// units" }])
  })

  it("leaves code in a language it does not know plain", async () => {
    await expect(createCodeHighlighter()(["SELECT 1"], "no-such-language")).resolves.toStrictEqual([
      [{ kind: "plain", text: "SELECT 1" }],
    ])
  })

  it("answers the same code again from its cache", async () => {
    const highlightCode = createCodeHighlighter()
    const first = await highlightCode(["const a = 1"], "typescript")

    await expect(highlightCode(["const a = 1"], "typescript")).resolves.toBe(first)
  })
})
