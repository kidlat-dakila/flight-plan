import { importerPatterns, moduleNameOf, type ImportedFile } from "@/import-graph/languages/typescript-importer-patterns"

const imported = (filePath: string, more: Partial<ImportedFile> = {}): ImportedFile => ({
  filePath,
  packageDirectory: null,
  packageName: null,
  pathAliases: [],
  ...more,
})

const isMatched = (file: ImportedFile, source: string): boolean =>
  importerPatterns(file).some((pattern) => new RegExp(pattern).test(source))

describe("moduleNameOf", () => {
  it("names a file without its folder and extension", () => {
    expect(moduleNameOf("src/orders/place-order.ts")).toBe("place-order")
    expect(moduleNameOf("src/orders/order.test.tsx")).toBe("order.test")
    expect(moduleNameOf("src/orders/order.d.ts")).toBe("order")
    expect(moduleNameOf("src/Checkout.vue")).toBe("Checkout")
  })
})

describe("importerPatterns", () => {
  const placeOrder = imported("src/orders/place-order.ts")

  it.each([
    ["a relative import", "import { placeOrder } from \"./orders/place-order\""],
    ["single quotes", "import { placeOrder } from './place-order'"],
    ["a template literal", "const orders = require(`./place-order`)"],
    ["the extension written out", "import { placeOrder } from \"./place-order.ts\""],
    ["the emitted extension", "import { placeOrder } from \"./place-order.js\""],
    ["a path alias", "import { placeOrder } from \"@/orders/place-order\""],
    ["a bare specifier from the base URL", "import { placeOrder } from \"place-order\""],
  ])("matches a file that names the module through %s", (_form, source) => {
    expect(isMatched(placeOrder, source)).toBe(true)
  })

  it.each([
    ["names a longer module", "import { a } from \"./replace-order\""],
    ["names a module that starts the same", "import { a } from \"./place-order-form\""],
    ["mentions the name outside a string", "const placeOrder = place-order"],
    ["imports the folder beside it", "import { a } from \"./orders\""],
  ])("does not match a file that %s", (_reason, source) => {
    expect(isMatched(placeOrder, source)).toBe(false)
  })

  it("matches a declaration file by the name of its module", () => {
    const ambient = imported("src/types/order.d.ts")

    expect(isMatched(ambient, "import type { Order } from \"./types/order\"")).toBe(true)
    expect(isMatched(ambient, "/// <reference path=\"order.d.ts\" />")).toBe(true)
  })

  describe("for the index file of a folder", () => {
    const index = imported("src/orders/index.ts")

    it.each([
      ["the folder's name", "import { a } from \"./orders\""],
      ["the index file itself", "import { a } from \"./orders/index\""],
      ["the current folder", "import { a } from \".\""],
      ["the current folder with a slash", "import { a } from \"./\""],
      ["the parent folder", "import { a } from '..'"],
      ["the parent folder with a slash", "import { a } from \"../\""],
      ["a folder further up", "import { a } from \"../..\""],
      ["a folder path that ends in a slash", "import { a } from \"./orders/\""],
    ])("matches a file that imports %s", (_form, source) => {
      expect(isMatched(index, source)).toBe(true)
    })

    it("does not match a file that imports another folder", () => {
      expect(isMatched(index, "import { a } from \"./payments\"")).toBe(false)
    })

    it("has no folder name to search for at the root of the repository", () => {
      expect(importerPatterns(imported("index.ts"))).toHaveLength(2)
    })
  })

  describe("for a file inside a package", () => {
    const button = imported("packages/ui/src/button.tsx", { packageDirectory: "packages/ui", packageName: "@acme/ui" })

    it.each([
      ["the package's name", "import { Button } from \"@acme/ui\""],
      ["a path below the package's name", "import { Button } from '@acme/ui/controls'"],
      ["the package's folder", "import { Button } from \"../../packages/ui\""],
    ])("matches a file that imports %s", (_form, source) => {
      expect(isMatched(button, source)).toBe(true)
    })

    it("does not match a file that imports a package whose name only starts the same", () => {
      expect(isMatched(button, "import { Button } from \"@acme/ui-kit\"")).toBe(false)
    })

    it("searches for the folder of a package that has no name", () => {
      const unnamed = imported("vendor/charts/lib/main.js", { packageDirectory: "vendor/charts" })

      expect(isMatched(unnamed, "const charts = require(\"../vendor/charts\")")).toBe(true)
    })
  })

  describe("for a file a path alias points at", () => {
    const pathAliases = [
      { name: "@config", targets: ["./src/settings/index.ts"] },
      { name: "@orders", targets: ["src/orders/place-order"] },
      { name: "@payments", targets: ["src/payments/charge.ts"] },
    ]

    it("matches a file that imports the alias of the file", () => {
      const aliased = imported("src/orders/place-order.ts", { pathAliases })

      expect(isMatched(aliased, "import { placeOrder } from \"@orders\"")).toBe(true)
      expect(isMatched(aliased, "import { charge } from \"@payments\"")).toBe(false)
    })

    it("matches a file that imports the alias of the folder the file is the index of", () => {
      const settings = imported("src/settings/index.ts", { pathAliases })

      expect(isMatched(settings, "import { settings } from '@config'")).toBe(true)
    })
  })
})
