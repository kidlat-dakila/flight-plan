import { codeOf, groupOf, outlineOf } from "@/code-blocks/__tests__/group-fixture"

const outlineOfCode = (...lines: readonly string[]): string[] => outlineOf(groupOf({ "src/file.tsx": codeOf(...lines) }), "src/file.tsx")

describe("the arguments of a root function", () => {
  it("makes one block per name of an argument that is taken apart, named after its key", () => {
    expect(outlineOfCode("function Card({ x, y: top, size = 1, ...rest }: Props) {}")).toStrictEqual([
      "function Card 1:1-1:58",
      "  root-argument-value x 1:17-1:18",
      "  root-argument-value y 1:20-1:26",
      "  root-argument-value size 1:28-1:36",
      "  root-argument-value rest 1:38-1:45",
    ])
  })

  it("makes one block of an argument that is not taken apart, and one under it for each member read from it", () => {
    expect(outlineOfCode("function SaveButton(props: Props, ref) {", "  props.onSave()", "  return [props.onSave, props.label]", "}")).toStrictEqual([
      "function SaveButton 1:1-4:2",
      "  root-argument-value props 1:21-1:33",
      "    root-argument-value onSave 2:3-2:15 3:11-3:23",
      "    root-argument-value label 3:25-3:36",
      "  root-argument-value ref 1:35-1:38",
      "  call props.onSave 2:3-2:17",
    ])
  })

  it("makes one block of the bare argument of an arrow function", () => {
    expect(outlineOfCode("const double = value => value * 2")).toStrictEqual(["function double 1:1-1:34", "  root-argument-value value 1:16-1:21"])
  })

  it("makes blocks of the arguments of a method of a root class", () => {
    expect(outlineOfCode("class Cart {", "  add(item, { count }) {}", "}")).toStrictEqual([
      "class Cart 1:1-3:2",
      "  method Cart.add 2:3-2:26",
      "    root-argument-value item 2:7-2:11",
      "    root-argument-value count 2:15-2:20",
    ])
  })

  it("makes a variable, and no root-argument-value, of an argument of a function that is not at the root", () => {
    expect(outlineOfCode("function Page() {", "  const handleDelete = (id) => id", "}")).toStrictEqual(["function Page 1:1-3:2", "  function handleDelete 2:3-2:34", "    variable id 2:25-2:27"])
  })
})
