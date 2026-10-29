import { Memo, once } from "@/shared/memo"

describe("Memo", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("makes a value once per key and gives the same one back afterwards", () => {
    const memo = new Memo<string, number>()
    const make = vi.fn(() => 3)

    expect(memo.remember("price", make)).toBe(3)
    expect(memo.remember("price", make)).toBe(3)
    expect(make).toHaveBeenCalledTimes(1)
  })

  it("stores, finds and lists what it holds, and forgets it when cleared", () => {
    const memo = new Memo<string, number>()

    expect(memo.store("price", 3)).toBe(3)
    expect(memo.has("price")).toBe(true)
    expect(memo.find("price")).toBe(3)
    expect(memo.find("tax")).toBeUndefined()
    expect(memo.values()).toStrictEqual([3])

    memo.clear()

    expect(memo.has("price")).toBe(false)
  })

  it("stores without copying what it already holds", () => {
    const memo = new Memo<string, number>()
    const makeMap = vi.spyOn(globalThis, "Map")

    memo.store("price", 3)
    memo.store("tax", 1)

    expect(makeMap).not.toHaveBeenCalled()
    expect(memo.values()).toStrictEqual([3, 1])
  })
})

describe("once", () => {
  it("makes a value on the first call only", () => {
    const make = vi.fn(() => ({ total: 1 }))
    const total = once(make)

    expect(total()).toBe(total())
    expect(make).toHaveBeenCalledTimes(1)
  })
})
