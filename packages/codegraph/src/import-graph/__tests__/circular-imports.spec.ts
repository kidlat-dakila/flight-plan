import { clusterImportGraphs, createImportGraphContext, traceImportGraph, type ImportGraphFile } from "@/import-graph"
import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeFiles } from "./fake-git-adapter"

const traceAll = async (files: FakeFiles, filePaths: readonly string[]): Promise<ImportGraphFile[][]> => {
  const gitAdapter = createFakeGitAdapter({ base: files, head: files })
  const context = await createImportGraphContext({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return await Promise.all(filePaths.map(async (filePath) => await traceImportGraph(context, filePath)))
}

const trace = async (files: FakeFiles, filePath: string): Promise<ImportGraphFile[]> => (await traceAll(files, [filePath]))[0]

const edgesOf = (traced: readonly ImportGraphFile[]): Record<string, { importedBy: readonly string[], importsTo: readonly string[] }> =>
  Object.fromEntries(traced.map(({ filePath, importedBy, importsTo }) => [filePath, { importedBy, importsTo }]))

describe("traceImportGraph with circular imports", () => {
  it("traces a circle of three files from any file in it, with every edge once", async () => {
    const files: FakeFiles = {
      "src/order.ts": "import \"./customer\"",
      "src/customer.ts": "import \"./invoice\"",
      "src/invoice.ts": "import \"./order\"",
    }
    const circle = {
      "src/customer.ts": { importedBy: ["src/order.ts"], importsTo: ["src/invoice.ts"] },
      "src/invoice.ts": { importedBy: ["src/customer.ts"], importsTo: ["src/order.ts"] },
      "src/order.ts": { importedBy: ["src/invoice.ts"], importsTo: ["src/customer.ts"] },
    }

    expect(edgesOf(await trace(files, "src/order.ts"))).toStrictEqual(circle)
    expect(edgesOf(await trace(files, "src/customer.ts"))).toStrictEqual(circle)
    expect(edgesOf(await trace(files, "src/invoice.ts"))).toStrictEqual(circle)
  })

  it("traces through a circle among the files a file imports", async () => {
    const traced = await trace(
      {
        "src/page.ts": "import \"./order\"",
        "src/order.ts": "import \"./customer\"",
        "src/customer.ts": "import \"./order\"\nimport \"./address\"",
        "src/address.ts": "",
      },
      "src/page.ts",
    )

    expect(edgesOf(traced)).toStrictEqual({
      "src/address.ts": { importedBy: ["src/customer.ts"], importsTo: [] },
      "src/customer.ts": { importedBy: ["src/order.ts"], importsTo: ["src/address.ts", "src/order.ts"] },
      "src/order.ts": { importedBy: ["src/customer.ts", "src/page.ts"], importsTo: ["src/customer.ts"] },
      "src/page.ts": { importedBy: [], importsTo: ["src/order.ts"] },
    })
  })

  it("traces through a circle among the files that import a file", async () => {
    const traced = await trace(
      {
        "src/app.ts": "import \"./order\"",
        "src/order.ts": "import \"./customer\"\nimport \"./money\"",
        "src/customer.ts": "import \"./order\"",
        "src/money.ts": "",
      },
      "src/money.ts",
    )

    expect(edgesOf(traced)).toStrictEqual({
      "src/app.ts": { importedBy: [], importsTo: ["src/order.ts"] },
      "src/customer.ts": { importedBy: ["src/order.ts"], importsTo: ["src/order.ts"] },
      "src/money.ts": { importedBy: ["src/order.ts"], importsTo: [] },
      "src/order.ts": { importedBy: ["src/app.ts", "src/customer.ts"], importsTo: ["src/customer.ts", "src/money.ts"] },
    })
  })

  it("traces a file that imports itself as importing nothing", async () => {
    expect(edgesOf(await trace({ "src/order.ts": "import \"./order\"\nimport \".\"", "src/index.ts": "" }, "src/order.ts"))).toStrictEqual({
      "src/index.ts": { importedBy: ["src/order.ts"], importsTo: [] },
      "src/order.ts": { importedBy: [], importsTo: ["src/index.ts"] },
    })
  })

  it("traces a barrel file and the files it exports that import it back", async () => {
    const traced = await trace(
      {
        "src/orders/index.ts": "export * from \"./order\"\nexport * from \"./customer\"",
        "src/orders/order.ts": "import { Customer } from \".\"",
        "src/orders/customer.ts": "import type { Order } from \"./index\"",
        "src/app.ts": "import { Order } from \"./orders\"",
      },
      "src/orders/order.ts",
    )

    expect(edgesOf(traced)).toStrictEqual({
      "src/app.ts": { importedBy: [], importsTo: ["src/orders/index.ts"] },
      "src/orders/customer.ts": { importedBy: ["src/orders/index.ts"], importsTo: ["src/orders/index.ts"] },
      "src/orders/index.ts": { importedBy: ["src/app.ts", "src/orders/customer.ts", "src/orders/order.ts"], importsTo: ["src/orders/customer.ts", "src/orders/order.ts"] },
      "src/orders/order.ts": { importedBy: ["src/orders/index.ts"], importsTo: ["src/orders/index.ts"] },
    })
  })

  it("traces two circles that share a file", async () => {
    const traced = await trace(
      {
        "src/hub.ts": "import \"./left\"\nimport \"./right\"",
        "src/left.ts": "import \"./hub\"",
        "src/right.ts": "import \"./far\"",
        "src/far.ts": "import \"./hub\"",
      },
      "src/left.ts",
    )

    expect(traced.map((file) => file.filePath)).toStrictEqual(["src/far.ts", "src/hub.ts", "src/left.ts", "src/right.ts"])
  })

  it("traces a long circle without running out of stack", async () => {
    const length = 3_000
    const files: FakeFiles = Object.fromEntries(
      Array.from({ length }, (_unused, index) => [`src/link-${String(index)}.ts`, `import "./link-${String((index + 1) % length)}"`]),
    )

    expect(await trace(files, "src/link-0.ts")).toHaveLength(length)
  }, 60_000)

  it("traces a circle of Python modules, through relative and absolute imports", async () => {
    const traced = await trace(
      {
        "shop/__init__.py": "from .orders import place_order",
        "shop/orders.py": "from shop.customers import Customer",
        "shop/customers.py": "from . import orders",
        "shop/invoices.py": "import shop",
      },
      "shop/customers.py",
    )

    expect(edgesOf(traced)).toStrictEqual({
      "shop/__init__.py": { importedBy: ["shop/invoices.py"], importsTo: ["shop/orders.py"] },
      "shop/customers.py": { importedBy: ["shop/orders.py"], importsTo: ["shop/orders.py"] },
      "shop/invoices.py": { importedBy: [], importsTo: ["shop/__init__.py"] },
      "shop/orders.py": { importedBy: ["shop/__init__.py", "shop/customers.py"], importsTo: ["shop/customers.py"] },
    })
  })

  it("puts every file of a circle in one cluster, whichever files of it changed", async () => {
    const files: FakeFiles = {
      "src/order.ts": "import \"./customer\"",
      "src/customer.ts": "import \"./invoice\"",
      "src/invoice.ts": "import \"./order\"",
      "src/alone.ts": "",
    }

    const clusters = clusterImportGraphs(await traceAll(files, ["src/order.ts", "src/invoice.ts", "src/alone.ts"]))

    expect(clusters.map((cluster) => cluster.map((file) => file.filePath))).toStrictEqual([
      ["src/alone.ts"],
      ["src/customer.ts", "src/invoice.ts", "src/order.ts"],
    ])
    expect(edgesOf(clusters[1])).toStrictEqual({
      "src/customer.ts": { importedBy: ["src/order.ts"], importsTo: ["src/invoice.ts"] },
      "src/invoice.ts": { importedBy: ["src/customer.ts"], importsTo: ["src/order.ts"] },
      "src/order.ts": { importedBy: ["src/invoice.ts"], importsTo: ["src/customer.ts"] },
    })
  })

  it("resolves imports when two tsconfig files extend each other", async () => {
    const traced = await trace(
      {
        "tsconfig.json": JSON.stringify({ extends: "./tsconfig.base.json", compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
        "tsconfig.base.json": JSON.stringify({ extends: "./tsconfig.json" }),
        "src/app.ts": "import \"@/pricing\"\nimport \"./money\"",
        "src/pricing.ts": "",
        "src/money.ts": "",
      },
      "src/app.ts",
    )

    expect(traced.map((file) => file.filePath)).toStrictEqual(["src/app.ts", "src/money.ts", "src/pricing.ts"])
  }, 20_000)

  it("resolves imports when two workspace packages name each other as their entry", async () => {
    const traced = await trace(
      {
        "packages/a/package.json": JSON.stringify({ name: "@acme/a", main: "../b" }),
        "packages/b/package.json": JSON.stringify({ name: "@acme/b", main: "../a" }),
        "packages/a/index.ts": "",
        "src/app.ts": "import \"@acme/a\"\nimport \"./money\"",
        "src/money.ts": "",
      },
      "src/app.ts",
    )

    expect(traced.map((file) => file.filePath)).toContain("src/money.ts")
  }, 20_000)
})
