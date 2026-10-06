import { firstOfEach } from "@/shared/first-of-each"

describe("firstOfEach", () => {
  it("keeps the first item of each key, in the order the items came in", () => {
    const uses = [
      { name: "subtotal", line: 4 },
      { name: "checkout", line: 9 },
      { name: "subtotal", line: 12 },
      { name: "render", line: 15 },
      { name: "checkout", line: 20 },
    ]

    expect(firstOfEach(uses, (use) => use.name)).toStrictEqual([
      { name: "subtotal", line: 4 },
      { name: "checkout", line: 9 },
      { name: "render", line: 15 },
    ])
  })

  it("gives nothing for no items", () => {
    expect(firstOfEach([], String)).toStrictEqual([])
  })
})
