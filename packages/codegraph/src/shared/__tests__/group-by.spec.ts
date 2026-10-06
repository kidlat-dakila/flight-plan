import { groupBy } from "@/shared/group-by"

describe("groupBy", () => {
  it("groups items by key, keeping the order the keys and the items first came in", () => {
    const files = ["src/b.ts", "shop/a.py", "src/a.ts", "shop/b.py"]
    const groups = groupBy(files, (file) => file.split("/")[0])

    expect([...groups]).toStrictEqual([
      ["src", ["src/b.ts", "src/a.ts"]],
      ["shop", ["shop/a.py", "shop/b.py"]],
    ])
  })

  it("gives no groups for no items", () => {
    expect([...groupBy([], String)]).toStrictEqual([])
  })
})
