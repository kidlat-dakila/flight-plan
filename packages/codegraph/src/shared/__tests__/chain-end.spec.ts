import { endOfChain, type ChainReach } from "@/shared/chain-end"

const LONG_CHAIN_LENGTH = 5000

const reachOf = (nextByItem: ReadonlyMap<string, string>): ChainReach<string> => ({
  nextOf: (item) => nextByItem.get(item) ?? null,
  keyOf: (item) => item,
})

const linkAt = (position: number): string => `link${String(position)}`

describe("endOfChain", () => {
  it("gives the item with no next one", () => {
    expect(endOfChain("a", reachOf(new Map([["a", "b"], ["b", "c"]])))).toBe("c")
  })

  it("gives the start when it has no next one", () => {
    expect(endOfChain("a", reachOf(new Map()))).toBe("a")
  })

  it("ends a loop at the last item before the chain comes back", () => {
    expect(endOfChain("a", reachOf(new Map([["a", "b"], ["b", "c"], ["c", "a"]])))).toBe("c")
    expect(endOfChain("a", reachOf(new Map([["a", "a"]])))).toBe("a")
  })

  it("follows a long chain without one stack frame per item", () => {
    const longChain = new Map(Array.from({ length: LONG_CHAIN_LENGTH }, (_, position) => [linkAt(position), linkAt(position + 1)] as const))

    expect(endOfChain(linkAt(0), reachOf(longChain))).toBe(linkAt(LONG_CHAIN_LENGTH))
  })
})
