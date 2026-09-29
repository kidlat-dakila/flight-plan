import { describe, expect, it } from "vitest"
import { parseSource } from "../../parse"
import { importBindingsOf } from "../imports"
import { resolveModule, type PyResolved } from "../resolve"

const set = (...paths: string[]) => new Set(paths)
const file = (path: string): PyResolved => ({ kind: "file", path })

describe("resolveModule (python)", () => {
  it("resolves an absolute package module to its file", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    expect(resolveModule("app/main.py", "pkg.pricing", 0, "price_of", files, [""], null)).toEqual(file("pkg/pricing.py"))
  })

  it("resolves a module to a package __init__", () => {
    const files = set("pkg/__init__.py", "pkg/sub/__init__.py")
    expect(resolveModule("app/main.py", "pkg.sub", 0, "", files, [""], null)).toEqual(file("pkg/sub/__init__.py"))
  })

  it("resolves a from-import of a submodule to the submodule file", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    // from pkg import pricing  -> pkg/pricing.py (pricing is a submodule, not an attribute)
    expect(resolveModule("app/main.py", "pkg", 0, "pricing", files, [""], null)).toEqual(file("pkg/pricing.py"))
  })

  it("resolves a relative import in the same package", () => {
    const files = set("pkg/__init__.py", "pkg/a.py", "pkg/b.py")
    // in pkg/a.py:  from . import b
    expect(resolveModule("pkg/a.py", "", 1, "b", files, [""], null)).toEqual(file("pkg/b.py"))
  })

  it("resolves a parent relative import", () => {
    const files = set("pkg/__init__.py", "pkg/sub/__init__.py", "pkg/sub/a.py", "pkg/util.py")
    // in pkg/sub/a.py:  from ..util import helper
    expect(resolveModule("pkg/sub/a.py", "util", 2, "helper", files, [""], null)).toEqual(file("pkg/util.py"))
  })

  it("resolves through a src root", () => {
    const files = set("proj/src/pkg/__init__.py", "proj/src/pkg/pricing.py")
    expect(resolveModule("proj/src/app.py", "pkg.pricing", 0, "x", files, ["proj/src", ""], null)).toEqual(
      file("proj/src/pkg/pricing.py"),
    )
  })

  it("resolves a PEP 420 namespace package (no __init__.py)", () => {
    const files = set("ns/pkg/mod.py") // no ns/__init__.py, no ns/pkg/__init__.py
    expect(resolveModule("app/main.py", "ns.pkg.mod", 0, "x", files, [""], null)).toEqual(file("ns/pkg/mod.py"))
  })

  it("resolves a cross-package import via the packages map", () => {
    const files = set("a/src/apkg/__init__.py", "a/src/apkg/pricing.py")
    const packages = new Map([["apkg", { dir: "a/src", topLevel: "apkg" }]])
    expect(resolveModule("b/src/bpkg/main.py", "apkg.pricing", 0, "x", files, ["b/src", ""], packages)).toEqual(
      file("a/src/apkg/pricing.py"),
    )
  })

  it("returns external for an unresolved module (stdlib / installed dep)", () => {
    expect(resolveModule("app/main.py", "os.path", 0, "join", set("app/main.py"), [""], null)).toEqual({
      kind: "external",
      module: "os.path",
    })
  })

  describe("known limits", () => {
    it("does not extract a dynamic importlib.import_module call as an import", async () => {
      const source = ['import importlib', 'mod = importlib.import_module("pkg.pricing")', ""].join("\n")
      const tree = await parseSource("app/main.py", source)
      if (tree === null) throw new Error("did not parse")
      // Only the literal `import importlib` statement is captured; the
      // dynamic call is ordinary code the import extractor does not walk
      // into, so it never reaches resolveModule at all.
      expect(importBindingsOf(tree)).toEqual([
        { local: "importlib", imported: "", module: "importlib", level: 0, typeOnly: false, line: 1 },
      ])
    })

    it("returns external for a sys.path-mutated import (unresolved without a matching root)", () => {
      // sys.path.insert(0, "vendor"); import extra_module
      // `vendor/` is added to sys.path only at runtime, so rootsFinder never
      // discovers it as a root; the file exists in `files` but is
      // unreachable from any root actually passed in.
      const files = set("vendor/extra_module.py")
      expect(resolveModule("app/main.py", "extra_module", 0, "", files, [""], null)).toEqual({
        kind: "external",
        module: "extra_module",
      })
    })
  })
})
