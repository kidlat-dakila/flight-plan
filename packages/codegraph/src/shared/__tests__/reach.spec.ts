import { walkBreadthFirst, walkBreadthFirstInTurns, walkDepthFirst, type ItemReach } from "@/shared/reach"

const LONG_CHAIN_LENGTH = 5000

const reachOf = (nextByItem: ReadonlyMap<string, readonly string[]>): ItemReach<string> => ({
  nextOf: (item) => nextByItem.get(item) ?? [],
  keyOf: (item) => item,
})

const linkAt = (position: number): string => `link${String(position)}`

const longChain = (): ReadonlyMap<string, readonly string[]> =>
  new Map(Array.from({ length: LONG_CHAIN_LENGTH }, (_, position) => [linkAt(position), [linkAt(position + 1)]] as const))

const branching = new Map([
  ["a", ["b", "c"]],
  ["b", ["d", "a"]],
  ["c", ["d", "e"]],
  ["d", ["c"]],
])

describe("walkDepthFirst", () => {
  it("gives each item once, finishing one branch before the next", () => {
    expect([...walkDepthFirst(["a"], reachOf(branching))]).toStrictEqual(["a", "b", "d", "c", "e"])
  })

  it("walks every start in turn and skips the ones already reached", () => {
    expect([...walkDepthFirst(["c", "b", "c"], reachOf(branching))]).toStrictEqual(["c", "d", "e", "b", "a"])
  })

  it("walks a chain of 5,000 items without running out of stack", () => {
    expect([...walkDepthFirst([linkAt(0)], reachOf(longChain()))]).toHaveLength(LONG_CHAIN_LENGTH + 1)
  })
})

describe("walkBreadthFirst", () => {
  it("gives each item once, nearest first", () => {
    expect([...walkBreadthFirst(["a"], reachOf(branching))]).toStrictEqual(["a", "b", "c", "d", "e"])
  })

  it("gives nothing for no starts", () => {
    expect([...walkBreadthFirst([], reachOf(branching))]).toStrictEqual([])
  })

  it("walks a chain of 5,000 items without running out of stack", () => {
    expect([...walkBreadthFirst([linkAt(0)], reachOf(longChain()))]).toHaveLength(LONG_CHAIN_LENGTH + 1)
  })
})

describe("walkBreadthFirstInTurns", () => {
  it("walks each group of starts after the one before, skipping what an earlier turn reached", () => {
    const nextByItem = new Map([["a", ["b"]], ["c", ["b", "d"]]])

    expect([...walkBreadthFirstInTurns([["a"], ["b"], ["c"], ["e"]], reachOf(nextByItem))]).toStrictEqual(["a", "b", "c", "d", "e"])
  })
})
