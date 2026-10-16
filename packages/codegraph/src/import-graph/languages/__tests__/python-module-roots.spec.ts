import { describe, expect, it } from "vitest"
import { pythonPackages, rootsFinder } from "@/import-graph/languages/python-module-roots"

function fake(files: Record<string, string>) {
  return { files: new Set(Object.keys(files)), read: async (p: string) => await Promise.resolve(files[p] ?? null) }
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

describe("rootsFinder base folder", () => {
  it.each([
    ["a script", { "scripts/tool.py": "" }, "scripts/tool.py", "scripts"],
    ["a test outside a package", { "tests/test_a.py": "" }, "tests/test_a.py", "tests"],
    ["a module of a package", { "app/__init__.py": "", "app/sub/__init__.py": "", "app/sub/a.py": "" }, "app/sub/a.py", ""],
    ["a module of a package in a folder", { "backend/shop/__init__.py": "", "backend/shop/models.py": "" }, "backend/shop/models.py", "backend"],
  ])("puts the first folder above %s that is not a package first", async (_form, layout, fromFile, baseFolder) => {
    const { files, read } = fake(layout)
    expect((await rootsFinder(files, read)(fromFile))[0]).toBe(baseFolder)
  })
})

describe("rootsFinder src folder", () => {
  it("uses a src folder that holds Python code, though the project file does not declare it", async () => {
    const { files, read } = fake({ "proj/pyproject.toml": "[project]\nname='proj'\n", "proj/src/pkg/__init__.py": "", "proj/tests/test_a.py": "" })
    expect(await rootsFinder(files, read)("proj/tests/test_a.py")).toStrictEqual(["proj/tests", "proj/src", "proj", ""])
  })

  it("leaves out a src folder that holds no Python code", async () => {
    const { files, read } = fake({ "proj/pyproject.toml": "[project]\nname='proj'\n", "proj/src/index.ts": "", "proj/pkg/__init__.py": "", "proj/pkg/a.py": "" })
    expect(await rootsFinder(files, read)("proj/pkg/a.py")).toStrictEqual(["proj", ""])
  })

  it("uses the src folder of the repository when there is no project file", async () => {
    const { files, read } = fake({ "src/pkg/__init__.py": "", "tests/test_a.py": "" })
    expect(await rootsFinder(files, read)("tests/test_a.py")).toStrictEqual(["tests", "src", ""])
  })
})

describe("pythonPackages", () => {
  it("maps the packages of a src folder the project file does not declare", async () => {
    const { files, read } = fake({ "a/pyproject.toml": "[project]\nname='a'\n", "a/src/apkg/__init__.py": "" })
    expect((await pythonPackages(files, read)).get("apkg")).toStrictEqual({ dir: "a/src", topLevel: "apkg" })
  })

  it("maps each project's top-level package to its root", async () => {
    const a = "[tool.setuptools]\npackage-dir = { \"\" = \"src\" }\n[project]\nname='a'\n"
    const { files, read } = fake({
      "a/pyproject.toml": a, "a/src/apkg/__init__.py": "",
      "b/pyproject.toml": "[project]\nname='b'\n", "b/bpkg/__init__.py": "",
    })
    const packages = await pythonPackages(files, read)
    expect(packages.get("apkg")).toStrictEqual({ dir: "a/src", topLevel: "apkg" })
    expect(packages.get("bpkg")).toStrictEqual({ dir: "b", topLevel: "bpkg" })
  })
})
