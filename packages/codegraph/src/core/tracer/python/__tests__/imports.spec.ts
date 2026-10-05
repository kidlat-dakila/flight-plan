import { describe, expect, it } from "vitest"
import { parseSource } from "@/core/tracer/parse"
import { importBindingsOf, reExportsOf } from "@/core/tracer/python/imports"

async function imports(source: string) {
  const tree = await parseSource("sample.py", source)
  if (tree === null) throw new Error("did not parse")
  return importBindingsOf(tree)
}

async function reExports(source: string) {
  const tree = await parseSource("__init__.py", source)
  if (tree === null) throw new Error("did not parse")
  return reExportsOf(tree)
}

describe("importBindingsOf (python)", () => {
  it("reads a from-import", async () => {
    expect(await imports("from pkg.pricing import price_of")).toStrictEqual([
      { local: "price_of", imported: "price_of", module: "pkg.pricing", level: 0, typeOnly: false, line: 1 },
    ])
  })

  it("reads an aliased from-import", async () => {
    expect(await imports("from pkg.pricing import price_of as p")).toMatchObject([
      { local: "p", imported: "price_of" },
    ])
  })

  it("reads a plain import as a module binding", async () => {
    expect(await imports("import pkg.pricing")).toStrictEqual([
      { local: "pkg.pricing", imported: "", module: "pkg.pricing", level: 0, typeOnly: false, line: 1 },
    ])
  })

  it("reads an aliased module import", async () => {
    expect(await imports("import pkg.pricing as pr")).toMatchObject([{ local: "pr", imported: "", module: "pkg.pricing" }])
  })

  it("counts relative-import levels", async () => {
    expect(await imports("from . import thing")).toMatchObject([{ imported: "thing", module: "", level: 1 }])
    expect(await imports("from ..sub import thing")).toMatchObject([{ imported: "thing", module: "sub", level: 2 }])
  })

  it("reads a wildcard import", async () => {
    expect(await imports("from pkg import *")).toMatchObject([{ imported: "*", module: "pkg" }])
  })

  it("marks TYPE_CHECKING imports type-only", async () => {
    const src = ["from typing import TYPE_CHECKING", "if TYPE_CHECKING:", "    from pkg import Thing"].join("\n")
    const found = await imports(src)
    const thing = found.find((b) => b.imported === "Thing")
    expect(thing?.typeOnly).toBe(true)
  })
})

describe("reExportsOf (python)", () => {
  it("reads a from-import in an __init__.py as a re-export", async () => {
    expect(await reExports("from .sub import thing")).toStrictEqual([
      { exported: "thing", imported: "thing", module: "sub", level: 1 },
    ])
  })

  it("skips wildcard imports", async () => {
    expect(await reExports("from pkg import *")).toStrictEqual([])
  })

  it("skips plain (non-from) imports", async () => {
    expect(await reExports("import pkg.pricing")).toStrictEqual([])
  })
})
