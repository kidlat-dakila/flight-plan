import { findManifestOf, isManifestPath, readManifest } from "@/code-blocks/manifests"

describe("the manifests of a repository", () => {
  it("says which files name the packages a folder uses", () => {
    expect(["package.json", "apps/web/package.json", "requirements.txt", "api/requirements-dev.txt", "pyproject.toml", "src/package.json.ts", "README.md"].filter(isManifestPath)).toStrictEqual([
      "package.json",
      "apps/web/package.json",
      "requirements.txt",
      "api/requirements-dev.txt",
      "pyproject.toml",
    ])
  })

  it("reads the packages of a package.json from every list of dependencies, and none from one that is not written as an object", () => {
    const written = JSON.stringify({ dependencies: { next: "15" }, devDependencies: { vitest: "4" }, peerDependencies: { react: "19" } })

    expect(readManifest("apps/web/package.json", written)).toStrictEqual({ folder: "apps/web", packages: ["next", "vitest", "react"] })
    expect(readManifest("package.json", "not json")).toStrictEqual({ folder: "", packages: [] })
  })

  it("reads the packages of a requirements file and of a pyproject file as the names a module is imported by", () => {
    expect(readManifest("requirements.txt", "Django>=4\n# pinned\nrest-framework==3.15\n").packages).toStrictEqual(["django", "rest_framework"])
    expect(readManifest("api/pyproject.toml", "dependencies = [\"flask>=3\", \"sqlalchemy[asyncio]\"]").packages).toStrictEqual(["flask", "sqlalchemy"])
  })

  it("gives a file the nearest manifest above it, with its path from the folder of that manifest", () => {
    const manifests = [readManifest("package.json", "{\"dependencies\":{\"turbo\":\"2\"}}"), readManifest("apps/web/package.json", "{\"dependencies\":{\"next\":\"15\"}}")]

    expect(findManifestOf("apps/web/app/page.tsx", manifests)).toStrictEqual({ packages: ["next"], packagePath: "app/page.tsx" })
    expect(findManifestOf("tools/build.ts", manifests)).toStrictEqual({ packages: ["turbo"], packagePath: "tools/build.ts" })
    expect(findManifestOf("apps/web/app/page.tsx", [])).toBeNull()
  })
})
