import { readModuleNames } from "@/import-graph/languages/python-bindings"

describe("readModuleNames", () => {
  it.each([
    ["an assignment", "rate = 1", ["rate"]],
    ["an annotated assignment", "rate: float = 1.0", ["rate"]],
    ["an augmented assignment", "rate += 1", ["rate"]],
    ["the targets of an unpacking", "first, (second, third) = 1, (2, 3)", ["first", "second", "third"]],
    ["a function", "def price_of(order):\n    return 1", ["price_of"]],
    ["a decorated function", "@cache\ndef price_of(order):\n    return 1", ["price_of"]],
    ["a class", "class Cart:\n    pass", ["Cart"]],
    ["an import of a module", "import shop.pricing", ["shop"]],
    ["an import under another name", "import shop.pricing as pricing", ["pricing"]],
    ["a name taken from a module", "from .pricing import price_of, Rate as PriceRate", ["price_of", "PriceRate"]],
    ["a name taken from another package", "from shop import pricing", ["pricing"]],
    ["the target of a loop", "for rate in RATES:\n    pass", ["rate"]],
    ["the target of a with", "with open_cart() as cart:\n    pass", ["cart"]],
    ["the name of an assignment expression", "(rate := 1)", ["rate"]],
    ["a name bound inside a condition or a try", "if READY:\n    rate = 1\ntry:\n    import fast_json as json\nexcept ImportError:\n    json = None", ["rate", "json"]],
  ])("reads %s", (_form, source, names) => {
    expect([...readModuleNames(source)]).toStrictEqual(names)
  })

  it.each([
    ["a function", "def load():\n    pricing = 1\n    import shop.cart", ["load"]],
    ["a class", "class Cart:\n    pricing = 1\n    def total(self):\n        return 1", ["Cart"]],
  ])("reads the name of %s and none of the names inside it", (_form, source, names) => {
    expect([...readModuleNames(source)]).toStrictEqual(names)
  })

  it.each([
    ["a module of its own package", "from . import pricing"],
    ["an attribute or an item", "shop.pricing = 1\nRATES[\"pricing\"] = 1"],
    ["everything taken from a module", "from .pricing import *"],
  ])("leaves out %s", (_form, source) => {
    expect([...readModuleNames(source)]).toStrictEqual([])
  })
})
