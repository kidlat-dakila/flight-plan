import { describe, expect, it } from "vitest"
import { traceImporters, type ImporterNode } from "../importTree"
import { moduleResolver } from "../typescript/resolve"
import { typescriptImportGraph } from "../typescript/index"

/**
 * The part of a path a specifier would name — the basename without extension,
 * or the directory for an `index` file. Enough for the dumb candidate filter
 * below; the real search is a separate concern.
 */
function stemOf(file: string): string {
  const base = (file.split("/").pop() ?? file).replace(/\.[^.]+$/, "")
  if (base !== "index") return base
  const directory = file.split("/").slice(-2, -1)[0] ?? ""
  return directory === "" ? base : directory
}

/**
 * The tracer over a literal repo — no git, no disk.
 *
 * `candidates` is deliberately as dumb as the real `git grep` filter: a file is
 * a candidate when a line mentioning import/export/from/require also contains
 * the imported file's stem. The point of every test is that resolving each
 * candidate for real is what makes the edge sound, not that the filter is
 * clever.
 */
function trace(files: Record<string, string>, target: string): Promise<ImporterNode> {
  const candidates = async (file: string): Promise<string[]> => {
    const stem = stemOf(file)
    return Object.entries(files)
      .filter(([, text]) =>
        text
          .split("\n")
          .some((line) => /(import|export|from|require)/.test(line) && line.includes(stem)),
      )
      .map(([path]) => path)
  }
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => files[one] ?? null
  const graph = typescriptImportGraph({ files: names, read, resolve: moduleResolver(names, read) }, candidates)
  return traceImporters(graph, target)
}

const PRICING = "export function priceOf() { return 1 }"

describe("who imports this file", () => {
  it("finds a direct static importer", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": ['import { priceOf } from "./pricing"', "priceOf()"].join("\n"),
      },
      "src/pricing.ts",
    )
    expect(tree.file).toBe("src/pricing.ts")
    expect(tree.importedBy).toHaveLength(1)
    expect(tree.importedBy[0]).toMatchObject({
      file: "src/checkout.ts",
      edges: [{ kind: "static", line: 1 }],
      importedBy: [],
    })
  })

  it("climbs a chain to the entry point", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": 'import { priceOf } from "./pricing"',
        "src/order.ts": 'import "./checkout"',
      },
      "src/pricing.ts",
    )
    const checkout = tree.importedBy[0]
    expect(checkout.file).toBe("src/checkout.ts")
    expect(checkout.importedBy[0]).toMatchObject({ file: "src/order.ts", importedBy: [] })
  })

  it("returns an empty tree for a file nobody imports", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": 'import { priceOf } from "./pricing"',
      },
      "src/checkout.ts",
    )
    expect(tree.importedBy).toEqual([])
  })
})

describe("through a barrel", () => {
  it("follows export … from as a static hop", async () => {
    // `app` imports the barrel by its directory (`./lib` → `lib/index.ts`),
    // which is how a barrel is actually reached.
    const tree = await trace(
      {
        "lib/pricing.ts": PRICING,
        "lib/index.ts": 'export { priceOf } from "./pricing"',
        "app.ts": 'import { priceOf } from "./lib"',
      },
      "lib/pricing.ts",
    )
    const barrel = tree.importedBy[0]
    expect(barrel).toMatchObject({ file: "lib/index.ts", edges: [{ kind: "static", line: 1 }] })
    expect(barrel.importedBy[0]).toMatchObject({ file: "app.ts" })
  })

  it("follows export * from", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/index.ts": 'export * from "./pricing"',
      },
      "src/pricing.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/index.ts", edges: [{ kind: "static" }] })
  })
})

describe("edge kinds", () => {
  it("labels a dynamic import()", async () => {
    const tree = await trace(
      {
        "src/mod.ts": "export const mod = 1",
        "src/user.ts": ["async function f() {", '  return await import("./mod")', "}"].join("\n"),
      },
      "src/mod.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({
      file: "src/user.ts",
      edges: [{ kind: "dynamic", line: 2 }],
    })
  })

  it("labels a require()", async () => {
    const tree = await trace(
      {
        "src/lib.ts": "export const x = 1",
        "src/cjs.ts": 'const lib = require("./lib")',
      },
      "src/lib.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({
      file: "src/cjs.ts",
      edges: [{ kind: "require", line: 1 }],
    })
  })

  it("labels a wholly type-only import", async () => {
    const tree = await trace(
      {
        "src/types.ts": "export type Money = number",
        "src/user.ts": 'import type { Money } from "./types"',
      },
      "src/types.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/user.ts", edges: [{ kind: "type" }] })
  })

  it("treats a mixed import (value + type) as static, since it runs", async () => {
    const tree = await trace(
      {
        "src/types.ts": ["export type Money = number", "export const zero = 0"].join("\n"),
        "src/user.ts": 'import { type Money, zero } from "./types"',
      },
      "src/types.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/user.ts", edges: [{ kind: "static" }] })
  })

  it("merges repeated imports of the same file into one importer", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": ["export const a = 1", "export const b = 2"].join("\n"),
        "src/checkout.ts": [
          'import { a } from "./pricing"',
          'import { b } from "./pricing"',
        ].join("\n"),
      },
      "src/pricing.ts",
    )
    expect(tree.importedBy).toHaveLength(1)
    expect(tree.importedBy[0].edges).toEqual([
      { kind: "static", line: 1 },
      { kind: "static", line: 2 },
    ])
  })
})

describe("resolution reused from specifier.ts", () => {
  it("resolves a directory import to its index", async () => {
    const tree = await trace(
      {
        "src/pricing/index.ts": PRICING,
        "src/app.ts": 'import { priceOf } from "./pricing"',
      },
      "src/pricing/index.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/app.ts" })
  })

  it("resolves an emitted .js specifier back to its .ts source", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/app.ts": 'import { priceOf } from "./pricing.js"',
      },
      "src/pricing.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/app.ts" })
  })

  it("resolves a tsconfig paths alias", async () => {
    const tree = await trace(
      {
        "src/tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }),
        "src/lib/pricing.ts": PRICING,
        "src/app.ts": 'import { priceOf } from "@/lib/pricing"',
      },
      "src/lib/pricing.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/app.ts" })
  })

  it("resolves a bare specifier through baseUrl", async () => {
    const tree = await trace(
      {
        "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: "." } }),
        "lib/thing.ts": "export const thing = 1",
        "src/app.ts": 'import thing from "lib/thing"',
      },
      "lib/thing.ts",
    )
    expect(tree.importedBy[0]).toMatchObject({ file: "src/app.ts" })
  })

  it("ignores an external specifier", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/app.ts": ['import React from "react"', 'import { priceOf } from "./pricing"'].join(
          "\n",
        ),
      },
      "src/pricing.ts",
    )
    // The only edge is the resolvable one; `react` is not in the tree.
    expect(tree.importedBy).toHaveLength(1)
    expect(tree.importedBy[0].edges).toEqual([{ kind: "static", line: 2 }])
  })
})

describe("the shape of the graph", () => {
  it("duplicates a shared ancestor reached two ways (a diamond)", async () => {
    const tree = await trace(
      {
        "src/core.ts": "export const core = 1",
        "src/left.ts": 'import { core } from "./core"',
        "src/right.ts": 'import { core } from "./core"',
        "src/app.ts": ['import "./left"', 'import "./right"'].join("\n"),
      },
      "src/core.ts",
    )
    expect(tree.importedBy.map((one) => one.file)).toEqual(["src/left.ts", "src/right.ts"])
    // `app` is reached through both `left` and `right`, so it appears twice.
    for (const branch of tree.importedBy) {
      expect(branch.importedBy[0]).toMatchObject({ file: "src/app.ts" })
    }
  })

  it("cuts an import cycle with a marker rather than looping", async () => {
    const tree = await trace(
      {
        "src/alpha.ts": 'import "./bravo"',
        "src/bravo.ts": 'import "./alpha"',
      },
      "src/alpha.ts",
    )
    const bravo = tree.importedBy[0]
    expect(bravo.file).toBe("src/bravo.ts")
    // Climbing bravo finds alpha again; alpha is already on the chain.
    expect(bravo.importedBy[0]).toMatchObject({ file: "src/alpha.ts", cycle: true, importedBy: [] })
  })
})

describe("in a monorepo", () => {
  it("resolves a cross-package alias per package, following tsconfig extends", async () => {
    // The common shape: a shared base config holds the aliases and each package
    // config only extends it. The finder must follow extends or every aliased
    // import across the package dies as external.
    const files = {
      "tsconfig.base.json": JSON.stringify({
        compilerOptions: { paths: { "@core/*": ["packages/core/src/*"] } },
      }),
      "packages/web/tsconfig.json": JSON.stringify({ extends: "../../tsconfig.base.json" }),
      "packages/core/src/pricing.ts": PRICING,
      "packages/web/src/app.ts": 'import { priceOf } from "@core/pricing"',
    }
    const tree = await trace(files, "packages/core/src/pricing.ts")
    expect(tree.importedBy[0]).toMatchObject({
      file: "packages/web/src/app.ts",
      edges: [{ kind: "static", line: 1 }],
    })
  })

  it("resolves a cross-package import by package name (subpath)", async () => {
    // `web` imports `core` by its published name, resolved through `core`'s
    // package.json rather than any tsconfig alias.
    const files = {
      "packages/core/package.json": JSON.stringify({
        name: "@org/core",
        exports: { ".": "./src/index.ts" },
      }),
      "packages/core/src/index.ts": "export const version = 1",
      "packages/core/pricing.ts": PRICING,
      "packages/web/src/app.ts": 'import { priceOf } from "@org/core/pricing"',
    }
    const tree = await trace(files, "packages/core/pricing.ts")
    expect(tree.importedBy[0]).toMatchObject({
      file: "packages/web/src/app.ts",
      edges: [{ kind: "static", line: 1 }],
    })
  })
})
