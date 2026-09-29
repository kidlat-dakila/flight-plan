/**
 * A declaration as plain data, and how a name a document writes finds one.
 *
 * One-based, inclusive lines. Produced by `declarationsIn`; read by the
 * walkthrough scaffold, which anchors cards on these names, and by document
 * resolution, which turns `{ symbol }` back into lines with `findIn`. Both
 * sides read the same list, so an anchor the scaffold writes always resolves.
 */

/** One declaration in a file. */
export type SymbolSpan = {
  /** Dotted path through the symbol tree, for example `StockService.hasStock`. */
  name: string
  /** 1-based, inclusive, covering the whole declaration. */
  from: number
  to: number
  /**
   * Where the declaration's own name sits, one-based.
   *
   * The seam between the diff and the call graph. A diff gives changed lines, a
   * symbol gives the declaration those lines fall in, and call hierarchy wants
   * a position inside that declaration's *name* — `from` is the first line of
   * `export function priceOf`, which is `export`, and a provider asked there
   * answers about nothing.
   */
  nameAt: { line: number; column: number }
  /**
   * What sort of declaration it is, in the only three sorts that matter here.
   *
   * `callable` is a function, a method or a constructor: a declaration whose
   * insides are its business rather than the document's. `container` is a
   * class, a namespace, an interface — a declaration whose *members* are the
   * declarations. Everything else is `other`.
   *
   * It exists because of a bug a real language server found. TypeScript reports
   * a local `const` inside a function as a child symbol of it, so "the
   * innermost declaration a change fell in" picked the local variable, and call
   * hierarchy answers nothing for one — the whole diagram came back empty. The
   * rule has to descend through containers and stop at bodies, and that
   * distinction cannot be made from a line range.
   */
  kind: "callable" | "container" | "other"
}

/**
 * Where a symbol lives, or null when nothing can say.
 *
 * Matches on the dotted path the author wrote, and requires it to be
 * unambiguous: a name that matches two declarations is refused rather than
 * resolved to the first, because the first is right half the time and the
 * failure is silent when it is not.
 *
 * Matching is by suffix, so `hasStock` finds `StockService.hasStock` when there
 * is only one. That is what lets an author write the name they say out loud and
 * only reach for the qualified form when the short one is ambiguous — and the
 * refusal message is what tells them it was.
 */
export function findIn(
  symbols: readonly SymbolSpan[],
  wanted: string,
): { from: number; to: number } | "ambiguous" | null {
  const exact = symbols.filter((symbol) => symbol.name === wanted)
  const matches =
    exact.length > 0
      ? exact
      : symbols.filter(
          (symbol) => symbol.name === wanted || symbol.name.endsWith(`.${wanted}`),
        )

  if (matches.length === 0) return null
  if (matches.length > 1) return "ambiguous"
  const only = matches[0] as SymbolSpan
  return { from: only.from, to: only.to }
}

