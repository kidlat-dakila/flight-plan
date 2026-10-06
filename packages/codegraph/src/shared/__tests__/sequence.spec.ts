import { mapInSequence } from "@/shared/sequence"

describe("mapInSequence", () => {
  it("maps the items one after the other, in their order", async () => {
    const double = vi.fn(async (item: number) => await Promise.resolve(item * 2))
    const mapped = await mapInSequence([1, 2, 3, 4, 5], double)

    expect(mapped).toStrictEqual([2, 4, 6, 8, 10])
    expect(double.mock.calls).toStrictEqual([[1], [2], [3], [4], [5]])
  })

  it("gives nothing for no items", async () => {
    expect(await mapInSequence([], async (item) => await Promise.resolve(item))).toStrictEqual([])
  })
})
