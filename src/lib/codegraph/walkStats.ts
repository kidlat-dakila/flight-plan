/**
 * Counters for what a call-graph walk does, for the server log.
 *
 * Module-wide and only ever growing: the parser and the stack-tree builder
 * count here, and the caller takes {@link walkCounts} before and after a walk
 * and logs the difference. Two walks at the same time would mix their counts;
 * the server runs one scaffold at a time.
 */
export type WalkCounts = {
  /** Trees parsed. */
  parses: number
  /** Characters of source handed to the parser. */
  parsedChars: number
  /** Milliseconds spent inside `parse`. */
  parseMs: number
  /** Trees freed with `delete()`; the rest wait for garbage collection. */
  treesFreed: number
  /** Declarations found in the changed files. */
  declarations: number
  /** Of those, the ones the diff touched: the walk's roots. */
  roots: number
  /** Milliseconds spent building the TypeScript import graph. */
  graphMs: number
  /** Files in that graph. */
  graphFiles: number
  /** Imports the graph did not hold, resolved on their own instead. */
  graphMisses: number
}

const counts: WalkCounts = {
  parses: 0,
  parsedChars: 0,
  parseMs: 0,
  treesFreed: 0,
  declarations: 0,
  roots: 0,
  graphMs: 0,
  graphFiles: 0,
  graphMisses: 0,
}

export function count(key: keyof WalkCounts, by = 1): void {
  counts[key] += by
}

/** A copy of the counters now. */
export function walkCounts(): WalkCounts {
  return { ...counts }
}

/** What was counted since `before`. */
export function countsSince(before: WalkCounts): WalkCounts {
  const now = walkCounts()
  return {
    parses: now.parses - before.parses,
    parsedChars: now.parsedChars - before.parsedChars,
    parseMs: Math.round(now.parseMs - before.parseMs),
    treesFreed: now.treesFreed - before.treesFreed,
    declarations: now.declarations - before.declarations,
    roots: now.roots - before.roots,
    graphMs: Math.round(now.graphMs - before.graphMs),
    graphFiles: now.graphFiles - before.graphFiles,
    graphMisses: now.graphMisses - before.graphMisses,
  }
}
