import { codeOf, groupOf } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const FILE_PATH = "shop/values.py"

const blocksOf = (...lines: readonly string[]): readonly StoredCodeBlock[] => groupOf({ [FILE_PATH]: codeOf(...lines) }).codeBlocks

const plainNamesOf = (...lines: readonly string[]): string[] =>
  blocksOf(...lines).filter((block) => block.isPlain === true).map((block) => block.name ?? "")

const returnedOf = (...lines: readonly string[]): string[] =>
  blocksOf(...lines).filter((block) => block.isReturned === true).map((block) => `${block.type} ${block.name ?? ""}`.trimEnd())

describe("a plain value at the root of a Python file", () => {
  it("marks a value written out as it is as plain, at any depth", () => {
    expect(plainNamesOf("MAX_ITEMS = 5", "DEFAULTS = {\"retries\": 3, \"sizes\": [1, 2]}", "NAME = f\"{PREFIX}-shop\"")).toStrictEqual(["MAX_ITEMS", "DEFAULTS", "NAME"])
  })

  it("does not mark a value with a call, a lambda or a comprehension anywhere inside it", () => {
    expect(plainNamesOf("TIMEOUT = compute_timeout()", "HANDLERS = {\"save\": lambda: 1}", "SQUARES = [n * n for n in RANGE]", "NAME = f\"{prefix()}-shop\"")).toStrictEqual([])
  })
})

describe("a function a Python function returns", () => {
  it("marks a function returned by name and a lambda in the return", () => {
    expect(returnedOf(
      "def logged(func):",
      "    def wrapper(*args):",
      "        return func(*args)",
      "    return wrapper",
      "",
      "def adder(step):",
      "    return lambda value: value + step",
    )).toStrictEqual(["function wrapper", "function"])
  })

  it("marks a decorated wrapper returned by name and a lambda in parentheses", () => {
    expect(returnedOf(
      "def logged(func):",
      "    @wraps(func)",
      "    def wrapper(*args):",
      "        return func(*args)",
      "    return wrapper",
      "",
      "def scaler(rate):",
      "    return (lambda value: value * rate)",
    )).toStrictEqual(["function wrapper", "function"])
  })

  it("does not mark a function only defined inside another", () => {
    expect(returnedOf("def total(items):", "    def price(item):", "        return item.price", "    return sum(map(price, items))")).toStrictEqual([])
  })
})
