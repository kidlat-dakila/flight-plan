import type { TokenLine } from "@flightplan/configurations"

export type CodeHighlighter = (lines: readonly string[], language: string) => Promise<readonly TokenLine[]>

export const highlightAsPlainText: CodeHighlighter = async (lines) =>
  await Promise.resolve(lines.map((text) => (text === "" ? [] : [{ text, kind: "plain" as const }])))
