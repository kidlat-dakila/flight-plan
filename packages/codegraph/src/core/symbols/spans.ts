export interface SymbolSpan {
  name: string
  from: number
  to: number
  nameAt: { line: number, column: number }
  kind: "callable" | "container" | "other"
}

export function findIn(
  symbols: readonly SymbolSpan[],
  wanted: string,
): { from: number, to: number } | "ambiguous" | null {
  const exact = symbols.filter((symbol) => symbol.name === wanted)
  const matches
    = exact.length > 0
      ? exact
      : symbols.filter(
          (symbol) => symbol.name === wanted || symbol.name.endsWith(`.${wanted}`),
        )

  if (matches.length === 0) return null
  if (matches.length > 1) return "ambiguous"
  const only = matches[0]
  return { from: only.from, to: only.to }
}
