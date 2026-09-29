import { describe, expect, it } from "vitest"
import { pythonPackages, rootsFinder } from "../moduleRoots"

function fake(files: Record<string, string>) {
  return { files: new Set(Object.keys(files)), read: async (p: string) => files[p] ?? null }
}

describe("rootsFinder", () => {
  it("uses the project dir as a root for a flat layout", async () => {
    const { files, read } = fake({ "proj/pyproject.toml": "[project]\nname='proj'\n", "proj/pkg/__init__.py": "", "proj/pkg/a.py": "" })
    const roots = await rootsFinder(files, read)("proj/pkg/a.py")
    expect(roots).toContain("proj")
    expect(roots).toContain("")
  })

  it("uses src/ as the root for a src-layout pyproject", async () => {
    const toml = "[tool.setuptools]\npackage-dir = { \"\" = \"src\" }\n[project]\nname='proj'\n"
    const { files, read } = fake({ "proj/pyproject.toml": toml, "proj/src/pkg/__init__.py": "", "proj/src/pkg/a.py": "" })
    const roots = await rootsFinder(files, read)("proj/src/pkg/a.py")
    expect(roots[0]).toBe("proj/src")
  })

  it("reads a poetry from=src package", async () => {
    const toml = "[tool.poetry]\nname='proj'\npackages = [{ include = 'pkg', from = 'src' }]\n"
    const { files, read } = fake({ "proj/pyproject.toml": toml, "proj/src/pkg/__init__.py": "" })
    const roots = await rootsFinder(files, read)("proj/src/pkg/x.py")
    expect(roots[0]).toBe("proj/src")
  })

  it("reads setup.cfg package_dir", async () => {
    const cfg = "[options]\npackage_dir =\n    =src\n"
    const { files, read } = fake({ "proj/setup.cfg": cfg, "proj/src/pkg/__init__.py": "" })
    const roots = await rootsFinder(files, read)("proj/src/pkg/x.py")
    expect(roots[0]).toBe("proj/src")
  })
})

describe("pythonPackages", () => {
  it("maps each project's top-level package to its root", async () => {
    const a = "[tool.setuptools]\npackage-dir = { \"\" = \"src\" }\n[project]\nname='a'\n"
    const { files, read } = fake({
      "a/pyproject.toml": a, "a/src/apkg/__init__.py": "",
      "b/pyproject.toml": "[project]\nname='b'\n", "b/bpkg/__init__.py": "",
    })
    const packages = await pythonPackages(files, read)
    expect(packages.get("apkg")).toEqual({ dir: "a/src", topLevel: "apkg" })
    expect(packages.get("bpkg")).toEqual({ dir: "b", topLevel: "bpkg" })
  })
})
