import { externalPackagesOf, planPackageManifest, type RootManifest } from "@/utils/package-manifest"

const BUILTIN_MODULES = ["fs", "path", "child_process"]

const ROOT: RootManifest = {
  version: "0.1.5",
  description: "Read a pull request as an ordered walkthrough.",
  repository: { type: "git", url: "git+https://github.com/kidlat-dakila/flight-plan.git" },
  license: "UNLICENSED",
  engines: { node: ">=22" },
  dependencies: { "tree-sitter": "0.25.1", "@napi-rs/keyring": "^2.1.0", "fastify": "~5.2.1" },
}

const metadataOf = (imports: readonly { readonly path: string, readonly external?: boolean }[]) => ({
  outputs: { "dist/package/backend/main.js": { imports } },
})

describe("externalPackagesOf", () => {
  it("lists each package the bundle leaves outside, once and in order", () => {
    const metadata = metadataOf([
      { path: "tree-sitter", external: true },
      { path: "@napi-rs/keyring", external: true },
      { path: "tree-sitter", external: true },
    ])

    expect(externalPackagesOf(metadata, BUILTIN_MODULES)).toStrictEqual(["@napi-rs/keyring", "tree-sitter"])
  })

  it("names the package of an import that reaches inside it", () => {
    const metadata = metadataOf([
      { path: "tree-sitter-typescript/bindings/node", external: true },
      { path: "@napi-rs/keyring/index.js", external: true },
    ])

    expect(externalPackagesOf(metadata, BUILTIN_MODULES)).toStrictEqual(["@napi-rs/keyring", "tree-sitter-typescript"])
  })

  it("leaves out Node's own modules, files and bundled imports", () => {
    const metadata = metadataOf([
      { path: "node:fs", external: true },
      { path: "path", external: true },
      { path: "fs/promises", external: true },
      { path: "./chunk.js", external: true },
      { path: "apps/backend/src/config.ts" },
    ])

    expect(externalPackagesOf(metadata, BUILTIN_MODULES)).toStrictEqual([])
  })
})

describe("planPackageManifest", () => {
  it("builds the manifest of the published package, with only the packages the bundle loads", () => {
    expect(planPackageManifest(ROOT, ["@napi-rs/keyring", "tree-sitter"])).toStrictEqual({
      kind: "built",
      manifest: {
        name: "@kidlat-dakila/flightplan",
        version: "0.1.5",
        description: "Read a pull request as an ordered walkthrough.",
        repository: { type: "git", url: "git+https://github.com/kidlat-dakila/flight-plan.git" },
        license: "UNLICENSED",
        engines: { node: ">=22" },
        bin: { flightplan: "backend/main.js" },
        files: ["backend", "frontend", "published-review"],
        publishConfig: { access: "public" },
        dependencies: { "@napi-rs/keyring": "^2.1.0", "tree-sitter": "0.25.1" },
      },
    })
  })

  it("rejects a package the root manifest does not list, because its version is unknown", () => {
    expect(planPackageManifest(ROOT, ["tree-sitter", "tree-sitter-python"])).toStrictEqual({
      kind: "rejected",
      message: "The bundle loads tree-sitter-python at run time, but the root package.json does not list it under dependencies.",
    })
  })
})
