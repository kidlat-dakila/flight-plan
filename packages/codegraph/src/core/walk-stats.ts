export interface WalkCounts {
  parses: number
  parsedChars: number
  parseMs: number
  treesFreed: number
  declarations: number
  roots: number
  graphMs: number
  graphFiles: number
  graphMisses: number
}

const NO_COUNTS: WalkCounts = {
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

class WalkCounter {
  private counts: WalkCounts = NO_COUNTS

  public readonly add = (key: keyof WalkCounts, by: number): void => {
    this.counts = { ...this.counts, [key]: this.counts[key] + by }
  }

  public readonly read = (): WalkCounts => this.counts
}

const counter = new WalkCounter()

export function count(key: keyof WalkCounts, by = 1): void {
  counter.add(key, by)
}

export function walkCounts(): WalkCounts {
  return counter.read()
}

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
