import type { CodeLine, CodeLinkTargets, Finding, ProseBlocks } from "@/lib/review-content"

export const paragraph = (text: string): ProseBlocks => [{ kind: "paragraph", inlines: [{ kind: "text", text }] }]

export const codeLine = (numberLabel: string, text: string, mark: CodeLine["mark"] = "context", isFocused = false): CodeLine => ({
  numberLabel,
  mark,
  isFocused,
  tokens: [{ text, kind: "plain" }],
})

export const CODE_LINKS: CodeLinkTargets = {
  "src/price.ts#priceOf": {
    pathLabel: "src/price.ts",
    rangeLabel: "Lines 3 to 4, 2 lines",
    lines: [codeLine("3", "export const priceOf = () => 1", "added", true)],
    anchorId: "waypoint-price-of",
    forgeLink: { href: "https://forge.test/blob/src/price.ts#L3-L4", label: "Open on GitHub" },
  },
}

export const createFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: "finding-1",
  kind: "risk",
  kindLabel: "Risk",
  title: [{ kind: "text", text: "The total can be negative" }],
  reading: paragraph("Nothing clamps it."),
  traceLabel: "Trace",
  trace: null,
  solution: null,
  ...overrides,
})
