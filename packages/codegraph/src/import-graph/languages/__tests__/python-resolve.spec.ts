import { describe, expect, it } from "vitest"
import { resolveModule, type PyResolved } from "@/import-graph/languages/python-resolve"

const set = (...paths: string[]) => new Set(paths)

const file = (path: string): PyResolved => ({ kind: "file", path })

describe("resolveModule (python)", () => {
  it("resolves an absolute package module to its file", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    expect(resolveModule("app/main.py", "pkg.pricing", 0, "price_of", files, [""], null)).toStrictEqual(file("pkg/pricing.py"))
  })

  it("resolves a module to a package __init__", () => {
    const files = set("pkg/__init__.py", "pkg/sub/__init__.py")
    expect(resolveModule("app/main.py", "pkg.sub", 0, "", files, [""], null)).toStrictEqual(file("pkg/sub/__init__.py"))
  })

  it("resolves a from-import of a submodule to the submodule file", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    expect(resolveModule("app/main.py", "pkg", 0, "pricing", files, [""], null)).toStrictEqual(file("pkg/pricing.py"))
  })

  it("resolves a relative import in the same package", () => {
    const files = set("pkg/__init__.py", "pkg/a.py", "pkg/b.py")
    expect(resolveModule("pkg/a.py", "", 1, "b", files, [""], null)).toStrictEqual(file("pkg/b.py"))
  })

  it("resolves a parent relative import", () => {
    const files = set("pkg/__init__.py", "pkg/sub/__init__.py", "pkg/sub/a.py", "pkg/util.py")
    expect(resolveModule("pkg/sub/a.py", "util", 2, "helper", files, [""], null)).toStrictEqual(file("pkg/util.py"))
  })

  it("resolves through a src root", () => {
    const files = set("proj/src/pkg/__init__.py", "proj/src/pkg/pricing.py")
    expect(resolveModule("proj/src/app.py", "pkg.pricing", 0, "x", files, ["proj/src", ""], null)).toStrictEqual(
      file("proj/src/pkg/pricing.py"),
    )
  })

  it("resolves a PEP 420 namespace package (no __init__.py)", () => {
    const files = set("ns/pkg/mod.py")
    expect(resolveModule("app/main.py", "ns.pkg.mod", 0, "x", files, [""], null)).toStrictEqual(file("ns/pkg/mod.py"))
  })

  it("resolves a cross-package import via the packages map", () => {
    const files = set("a/src/apkg/__init__.py", "a/src/apkg/pricing.py")
    const packages = new Map([["apkg", { dir: "a/src", topLevel: "apkg" }]])
    expect(resolveModule("b/src/bpkg/main.py", "apkg.pricing", 0, "x", files, ["b/src", ""], packages)).toStrictEqual(
      file("a/src/apkg/pricing.py"),
    )
  })

  it("resolves a package before a module of the same name", () => {
    const files = set("pkg.py", "pkg/__init__.py")
    expect(resolveModule("app/main.py", "pkg", 0, "", files, [""], null)).toStrictEqual(file("pkg/__init__.py"))
  })

  it("resolves a module before a stub of the same name", () => {
    const files = set("pkg.py", "pkg.pyi", "pkg/__init__.pyi")
    expect(resolveModule("app/main.py", "pkg", 0, "", files, [""], null)).toStrictEqual(file("pkg.py"))
  })

  it("resolves a name the package entry binds to the entry, though a submodule has the name", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    const bindsPricing = (packageEntry: string, name: string) => packageEntry === "pkg/__init__.py" && name === "pricing"
    expect(resolveModule("app/main.py", "pkg", 0, "pricing", files, [""], null, bindsPricing)).toStrictEqual(file("pkg/__init__.py"))
  })

  it("resolves a name the package entry does not bind to the submodule", () => {
    const files = set("pkg/__init__.py", "pkg/pricing.py")
    expect(resolveModule("app/main.py", "pkg", 0, "pricing", files, [""], null, () => false)).toStrictEqual(file("pkg/pricing.py"))
  })

  it("returns external for an unresolved module (stdlib / installed dep)", () => {
    expect(resolveModule("app/main.py", "os.path", 0, "join", set("app/main.py"), [""], null)).toStrictEqual({
      kind: "external",
      module: "os.path",
    })
  })

  describe("known limits", () => {
    it("returns external for a sys.path-mutated import (unresolved without a matching root)", () => {
      const files = set("vendor/extra_module.py")
      expect(resolveModule("app/main.py", "extra_module", 0, "", files, [""], null)).toStrictEqual({
        kind: "external",
        module: "extra_module",
      })
    })
  })
})
