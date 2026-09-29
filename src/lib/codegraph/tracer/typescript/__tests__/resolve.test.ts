import { describe, expect, it } from "vitest"
import { moduleResolver } from "../resolve"

/** A resolver over a literal set of files. */
function resolver(files: Record<string, string>) {
  return moduleResolver(new Set(Object.keys(files)), async (one) => files[one] ?? null)
}

const config = (compilerOptions: Record<string, unknown>, more: Record<string, unknown> = {}) =>
  JSON.stringify({ ...more, compilerOptions })

describe("moduleResolver with tsconfig paths", () => {
  it("resolves a target against the directory of the config that declares it", async () => {
    // The modern default: no baseUrl, so a `paths` target resolves against the
    // directory the config sits in — the monorepo case.
    const resolve = resolver({
      "packages/shop/tsconfig.json": config({ paths: { "@/*": ["./lib/*"] } }),
      "packages/shop/lib/pricing.ts": "",
    })
    expect(await resolve("packages/shop/app.ts", "@/pricing")).toBe("packages/shop/lib/pricing.ts")
  })

  it("resolves a bare specifier against baseUrl", async () => {
    const resolve = resolver({
      "tsconfig.json": config({ baseUrl: "src" }),
      "src/lib/thing.ts": "",
    })
    expect(await resolve("src/app.ts", "lib/thing")).toBe("src/lib/thing.ts")
  })

  it("reads a config with comments and trailing commas", async () => {
    const resolve = resolver({
      "tsconfig.json": '{ "compilerOptions": { /* aliases */ "paths": { "@/*": ["./src/*"], } } }',
      "src/pricing.ts": "",
    })
    expect(await resolve("src/app.ts", "@/pricing")).toBe("src/pricing.ts")
  })

  it("gives an alias no meaning without a config", async () => {
    const resolve = resolver({ "packages/shop/lib/pricing.ts": "" })
    expect(await resolve("packages/shop/app.ts", "@/pricing")).toBeNull()
  })

  it("picks the nearest config per package (monorepo)", async () => {
    const resolve = resolver({
      "packages/web/tsconfig.json": config({ paths: { "@app/*": ["./src/*"] } }),
      "packages/api/tsconfig.json": config({ paths: { "@app/*": ["./lib/*"] } }),
      "packages/web/src/x.ts": "",
      "packages/api/lib/x.ts": "",
    })
    expect(await resolve("packages/web/src/a.ts", "@app/x")).toBe("packages/web/src/x.ts")
    expect(await resolve("packages/api/src/a.ts", "@app/x")).toBe("packages/api/lib/x.ts")
  })

  it("follows extends, with inherited targets rooted at the base config", async () => {
    // The package config only extends a base that holds the aliases. Without
    // following extends, this package gets none.
    const resolve = resolver({
      "tsconfig.base.json": config({ paths: { "@app/*": ["packages/app/src/*"] } }),
      "packages/app/tsconfig.json": JSON.stringify({ extends: "../../tsconfig.base.json" }),
      "packages/app/src/x.ts": "",
    })
    expect(await resolve("packages/app/src/a.ts", "@app/x")).toBe("packages/app/src/x.ts")
  })

  it("lets a child config's paths replace the inherited paths as a whole", async () => {
    // As TypeScript does: `paths` is one compiler option, so the child's table
    // replaces the base's; patterns are not merged.
    const resolve = resolver({
      "tsconfig.base.json": config({ paths: { "@app/*": ["packages/base/*"], "@shared/*": ["shared/*"] } }),
      "packages/app/tsconfig.json": config({ paths: { "@app/*": ["./src/*"] } }, { extends: "../../tsconfig.base.json" }),
      "packages/app/src/x.ts": "",
      "packages/base/x.ts": "",
      "shared/y.ts": "",
    })
    expect(await resolve("packages/app/src/a.ts", "@app/x")).toBe("packages/app/src/x.ts")
    expect(await resolve("packages/app/src/a.ts", "@shared/y")).toBeNull()
  })

  it("follows extends into a workspace package, which git holds outside node_modules", async () => {
    const resolve = resolver({
      "packages/tsconfig/package.json": JSON.stringify({ name: "@acme/tsconfig" }),
      "packages/tsconfig/tsconfig.json": config({ paths: { "@shared/*": ["../../shared/*"] } }),
      "packages/shop/tsconfig.json": JSON.stringify({ extends: "@acme/tsconfig/tsconfig.json" }),
      "packages/shop/src/b.ts": "",
      "shared/y.ts": "",
    })
    expect(await resolve("packages/shop/src/a.ts", "./b")).toBe("packages/shop/src/b.ts")
    expect(await resolve("packages/shop/src/a.ts", "@shared/y")).toBe("shared/y.ts")
  })

  it("follows extends that names a package alone, or a file without .json, as TypeScript does", async () => {
    const resolve = resolver({
      "packages/tsconfig/package.json": JSON.stringify({ name: "@acme/tsconfig" }),
      "packages/tsconfig/tsconfig.json": config({ paths: { "@a/*": ["../../a/*"] } }),
      "packages/tsconfig/node.json": config({ paths: { "@b/*": ["../../b/*"] } }),
      "packages/one/tsconfig.json": JSON.stringify({ extends: "@acme/tsconfig" }),
      "packages/two/tsconfig.json": JSON.stringify({ extends: "@acme/tsconfig/node" }),
      "a/x.ts": "",
      "b/x.ts": "",
    })
    expect(await resolve("packages/one/src/i.ts", "@a/x")).toBe("a/x.ts")
    expect(await resolve("packages/two/src/i.ts", "@b/x")).toBe("b/x.ts")
  })

  it("still resolves when extends names a config the repository does not hold", async () => {
    // An npm base config lives in node_modules, which git does not hold. Its
    // options are lost; the imports under the config are not.
    const resolve = resolver({
      "packages/shop/tsconfig.json": JSON.stringify({ extends: ["@tsconfig/node20/tsconfig.json", "./tsconfig.paths.json"] }),
      "packages/shop/tsconfig.paths.json": config({ paths: { "@/*": ["./src/*"] } }),
      "packages/shop/src/b.ts": "",
    })
    expect(await resolve("packages/shop/src/a.ts", "./b")).toBe("packages/shop/src/b.ts")
    expect(await resolve("packages/shop/src/a.ts", "@/b")).toBe("packages/shop/src/b.ts")
  })
})

describe("moduleResolver with workspace packages", () => {
  it("resolves a bare package import to its source entry", async () => {
    const resolve = resolver({
      "packages/core/package.json": JSON.stringify({ name: "@org/core", exports: { ".": "./src/index.ts" } }),
      "packages/core/src/index.ts": "",
      "packages/core/src/pricing.ts": "",
    })
    expect(await resolve("packages/web/src/app.ts", "@org/core")).toBe("packages/core/src/index.ts")
  })

  it("falls back to the source index when the entry fields point at build output", async () => {
    const resolve = resolver({
      "packages/core/package.json": JSON.stringify({ name: "@org/core", main: "dist/index.js" }),
      "packages/core/src/index.ts": "",
    })
    // `dist/index.js` is not tracked; the source index is the honest answer.
    expect(await resolve("packages/web/src/app.ts", "@org/core")).toBe("packages/core/src/index.ts")
  })

  it("resolves a package subpath to a file under its directory", async () => {
    const resolve = resolver({
      "packages/core/package.json": JSON.stringify({ name: "@org/core" }),
      "packages/core/src/pricing.ts": "",
    })
    expect(await resolve("packages/web/src/app.ts", "@org/core/src/pricing")).toBe("packages/core/src/pricing.ts")
  })

  it("ignores a package.json with no name", async () => {
    const resolve = resolver({
      "packages/core/package.json": JSON.stringify({ version: "1.0.0" }),
      "packages/core/src/index.ts": "",
    })
    expect(await resolve("packages/web/src/app.ts", "core")).toBeNull()
  })

  it("is null for a package the repository does not hold", async () => {
    const resolve = resolver({ "packages/core/src/index.ts": "" })
    expect(await resolve("packages/web/src/app.ts", "react")).toBeNull()
  })
})

describe("moduleResolver on relative specifiers", () => {
  it("probes extensions, index files and the emitted .js convention", async () => {
    const resolve = resolver({ "src/pricing.ts": "", "src/cart/index.tsx": "" })
    expect(await resolve("src/app.ts", "./pricing")).toBe("src/pricing.ts")
    expect(await resolve("src/app.ts", "./pricing.js")).toBe("src/pricing.ts")
    expect(await resolve("src/app.ts", "./cart")).toBe("src/cart/index.tsx")
  })

  it("is null for a file the repository does not hold", async () => {
    const resolve = resolver({ "src/pricing.ts": "" })
    expect(await resolve("src/app.ts", "./missing")).toBeNull()
  })
})
