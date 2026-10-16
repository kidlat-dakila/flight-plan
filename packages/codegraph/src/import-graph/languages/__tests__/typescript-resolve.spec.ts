import { describe, expect, it } from "vitest"
import { moduleResolver } from "@/import-graph/languages/typescript-resolve"

function resolver(files: Record<string, string>) {
  return moduleResolver(new Set(Object.keys(files)), async (one) => await Promise.resolve(files[one] ?? null))
}

const config = (compilerOptions: Record<string, unknown>, more: Record<string, unknown> = {}) =>
  JSON.stringify({ ...more, compilerOptions })

describe("moduleResolver with tsconfig paths", () => {
  it("resolves a target against the directory of the config that declares it", async () => {
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
      "tsconfig.json": "{ \"compilerOptions\": { /* aliases */ \"paths\": { \"@/*\": [\"./src/*\"], } } }",
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
    const resolve = resolver({
      "tsconfig.base.json": config({ paths: { "@app/*": ["packages/app/src/*"] } }),
      "packages/app/tsconfig.json": JSON.stringify({ extends: "../../tsconfig.base.json" }),
      "packages/app/src/x.ts": "",
    })
    expect(await resolve("packages/app/src/a.ts", "@app/x")).toBe("packages/app/src/x.ts")
  })

  it("lets a child config's paths replace the inherited paths as a whole", async () => {
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

describe("moduleResolver with the exports of a workspace package", () => {
  const exportingPackage = {
    "packages/core/package.json": JSON.stringify({
      name: "@org/core",
      exports: {
        ".": { types: "./src/index.ts", default: "./dist/index.js" },
        "./feature": "./src/feature.ts",
        "./internal/*": "./src/internal/*.ts",
      },
    }),
    "packages/core/src/index.ts": "",
    "packages/core/src/feature.ts": "",
    "packages/core/feature.ts": "",
    "packages/core/src/internal/deep.ts": "",
  }

  it.each([
    ["the entry of a condition", "@org/core", "packages/core/src/index.ts"],
    ["a subpath, before a file of that name in the package folder", "@org/core/feature", "packages/core/src/feature.ts"],
    ["a subpath of a wildcard", "@org/core/internal/deep", "packages/core/src/internal/deep.ts"],
  ])("resolves %s", async (_form, specifier, resolved) => {
    expect(await resolver(exportingPackage)("packages/web/src/app.ts", specifier)).toBe(resolved)
  })

  it("lets tsconfig paths come before a workspace package whose name they share", async () => {
    const resolve = resolver({
      "tsconfig.json": config({ paths: { "@org/ui/*": ["./packages/ui/src/components/*"] } }),
      "packages/ui/package.json": JSON.stringify({ name: "@org/ui" }),
      "packages/ui/src/components/Button/index.tsx": "",
    })
    expect(await resolve("apps/web/src/page.tsx", "@org/ui/Button")).toBe("packages/ui/src/components/Button/index.tsx")
  })
})

describe("moduleResolver with the config that holds a file", () => {
  const viteProject = {
    "apps/web/tsconfig.json": JSON.stringify({ files: [], references: [{ path: "./tsconfig.node.json" }, { path: "./tsconfig.app.json" }] }),
    "apps/web/tsconfig.node.json": JSON.stringify({ include: ["vite.config.ts"], compilerOptions: { paths: { "@/*": ["./tools/*"] } } }),
    "apps/web/tsconfig.app.json": JSON.stringify({ include: ["src/**/*.ts", "src/**/*.vue"], compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
    "apps/web/src/lib/util.ts": "",
    "apps/web/tools/lib/util.ts": "",
  }

  it.each([
    ["a TypeScript file", "apps/web/src/main.ts", "apps/web/src/lib/util.ts"],
    ["a Vue file", "apps/web/src/App.vue", "apps/web/src/lib/util.ts"],
    ["a file another referenced config includes", "apps/web/vite.config.ts", "apps/web/tools/lib/util.ts"],
  ])("follows the references of a config that holds no file to the one that includes %s", async (_form, fromFile, resolved) => {
    expect(await resolver(viteProject)(fromFile, "@/lib/util")).toBe(resolved)
  })

  it("keeps the include a config inherits through extends", async () => {
    const resolve = resolver({
      "apps/web/tsconfig.json": JSON.stringify({ files: [], references: [{ path: "./tsconfig.app.json" }] }),
      "apps/web/tsconfig.base.json": JSON.stringify({ include: ["src"] }),
      "apps/web/tsconfig.app.json": JSON.stringify({ extends: "./tsconfig.base.json", compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
      "apps/web/src/lib/util.ts": "",
    })
    expect(await resolve("apps/web/src/main.ts", "@/lib/util")).toBe("apps/web/src/lib/util.ts")
  })

  it("reads the paths of a jsconfig.json", async () => {
    const resolve = resolver({
      "apps/web/jsconfig.json": config({ paths: { "~/*": ["./src/*"] } }),
      "apps/web/src/util.js": "",
    })
    expect(await resolve("apps/web/src/main.jsx", "~/util")).toBe("apps/web/src/util.js")
  })

  it("takes the tsconfig.json of a folder before its jsconfig.json", async () => {
    const resolve = resolver({
      "apps/web/tsconfig.json": config({ paths: { "~/*": ["./src/*"] } }),
      "apps/web/jsconfig.json": config({ paths: { "~/*": ["./lib/*"] } }),
      "apps/web/src/util.ts": "",
      "apps/web/lib/util.ts": "",
    })
    expect(await resolve("apps/web/src/main.ts", "~/util")).toBe("apps/web/src/util.ts")
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
