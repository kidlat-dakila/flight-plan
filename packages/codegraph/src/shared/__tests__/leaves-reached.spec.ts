import { listLeavesReached, type LeafReach } from "@/shared/leaves-reached"

const LEAF_PREFIX = "leaf"
const LONG_CHAIN_LENGTH = 5000

const reachOf = (nextByItem: ReadonlyMap<string, readonly string[]>): LeafReach<string> => ({
  nextOf: (item) => nextByItem.get(item) ?? [],
  isLeaf: (item) => item.startsWith(LEAF_PREFIX),
  keyOf: (item) => item,
})

const linkAt = (position: number): string => `link${String(position)}`

describe("listLeavesReached", () => {
  it("gives each leaf once, in the order it is first reached", () => {
    const nextByItem = new Map([
      ["start", ["a", "leafX", "b"]],
      ["a", ["leafY", "b"]],
      ["b", ["leafZ", "leafY"]],
    ])

    expect(listLeavesReached("start", reachOf(nextByItem))).toStrictEqual(["leafY", "leafZ", "leafX"])
  })

  it("stops at items it already opened, the start among them", () => {
    const nextByItem = new Map([
      ["start", ["a"]],
      ["a", ["b", "start"]],
      ["b", ["a", "leafX"]],
    ])

    expect(listLeavesReached("start", reachOf(nextByItem))).toStrictEqual(["leafX"])
  })

  it("walks a chain of 5,000 items without running out of stack", () => {
    const links = Array.from({ length: LONG_CHAIN_LENGTH }, (_, position) => [linkAt(position), [linkAt(position + 1)]] as const)
    const nextByItem = new Map([...links, [linkAt(LONG_CHAIN_LENGTH), ["leafEnd"]]])

    expect(listLeavesReached(linkAt(0), reachOf(nextByItem))).toStrictEqual(["leafEnd"])
  })

  it("opens the start even when it counts as a leaf", () => {
    const nextByItem = new Map([["leafStart", ["a"]], ["a", ["leafX"]]])

    expect(listLeavesReached("leafStart", reachOf(nextByItem))).toStrictEqual(["leafX"])
  })

  it("gives nothing when the start leads nowhere", () => {
    expect(listLeavesReached("start", reachOf(new Map()))).toStrictEqual([])
  })
})
