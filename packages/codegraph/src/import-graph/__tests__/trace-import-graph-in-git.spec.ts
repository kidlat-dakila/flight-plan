import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { createImportGraphContext, traceImportGraph, type ImportGraphFile } from "@/import-graph"
import type * as GitForge from "@flightplan/git-forge"

const run = promisify(execFile)

type Files = Readonly<Record<string, string>>

const BASE_BRANCH = "main"
const HEAD_BRANCH = "discounts"

const BASE_FILES: Files = {
  "package.json": JSON.stringify({ name: "storefront", private: true }),
  "tsconfig.base.json": JSON.stringify({ compilerOptions: { paths: { "@config": ["./apps/shop/src/settings/index.ts"] } } }),
  "packages/money/package.json": JSON.stringify({ name: "@acme/money", main: "./src/index.ts" }),
  "packages/money/src/index.ts": "export * from \"./round.js\"\n",
  "packages/money/src/round.ts": "export const round = (amount: number): number => Math.round(amount)\n",
  "apps/shop/tsconfig.json": JSON.stringify({ extends: "../../tsconfig.base.json", compilerOptions: { paths: { "@/*": ["./src/*"], "@config": ["./src/settings/index.ts"] } } }),
  "apps/shop/src/settings/index.ts": "export const currency = `EUR`\n",
  "apps/shop/src/pricing.ts": "import { round } from '@acme/money'\nimport { currency } from \"@config\"\nexport const priceOf = () => round(1) + currency\n",
  "apps/shop/src/cart/index.ts": "import { priceOf } from \"@/pricing\"\nexport const subtotal = () => priceOf()\n",
  "apps/shop/src/cart/lines.ts": "import { subtotal } from \".\"\nexport const lines = () => subtotal()\n",
  "apps/shop/src/Checkout.vue": "<script setup lang=\"ts\">\nimport { subtotal } from \"./cart\"\n</script>\n<template><p>{{ subtotal() }}</p></template>\n",
  "apps/shop/src/legacy.js": "const { priceOf } = require(`./pricing`)\nmodule.exports = { priceOf }\n",
  "apps/shop/src/lazy.ts": "export const load = () => import(\"./pricing\")\n",
  "apps/shop/src/notes.ts": "export const note = \"pricing lives in ./pricing and @acme/money\"\n",
  "apps/admin/src/pricing.ts": "export const priceOf = () => 0\n",
  "apps/admin/src/page.ts": "import { priceOf } from \"./pricing\"\nexport const page = () => priceOf()\n",
  "services/billing/pyproject.toml": "[tool.setuptools.package-dir]\n\"\" = \"src\"\n",
  "services/billing/src/billing/__init__.py": "from .invoice import invoice_of\n",
  "services/billing/src/billing/invoice.py": "from billing.tax import (\n    rate_of,\n)\nfrom . import rounding\n\ndef invoice_of(order):\n    return rounding.round_up(order.total * rate_of(order))\n",
  "services/billing/src/billing/tax.py": "def rate_of(order):\n    return 1.2\n",
  "services/billing/src/billing/rounding.py": "import math\n\ndef round_up(amount):\n    return math.ceil(amount)\n",
  "services/billing/src/billing/notes.py": "NOTE = \"import billing.tax before invoicing\"\n",
  "services/billing/tests/test_invoice.py": "def test_invoice():\n\tfrom billing import invoice_of\n\tassert invoice_of\n",
  "services/shipping/tax.py": "def rate_of(parcel):\n    return 1.0\n",
  "services/shipping/label.py": "from tax import rate_of\n",
}

const HEAD_FILES: Files = {
  "packages/money/src/round.ts": "export const round = (amount: number): number => Math.round(amount * 100) / 100\n",
  "services/billing/src/billing/tax.py": "def rate_of(order):\n    return 1.25\n",
  "apps/shop/src/discount.ts": "import { round } from \"@acme/money\"\nexport const discountOf = () => round(0.1)\n",
  "apps/shop/src/pricing.ts": "import { round } from '@acme/money'\nimport { currency } from \"@config\"\nimport { discountOf } from \"./discount\"\nexport const priceOf = () => round(1 - discountOf()) + currency\n",
}

const DELETED_FILE = "apps/shop/src/legacy.js"

const writeFiles = async (root: string, files: Files): Promise<void> => {
  await Promise.all(
    Object.entries(files).map(async ([filePath, text]) => {
      await fs.mkdir(path.join(root, path.dirname(filePath)), { recursive: true })
      await fs.writeFile(path.join(root, filePath), text)
    }),
  )
}

const createRepository = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-import-graph-"))
  onTestFinished(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })
  const git = async (...gitArguments: string[]): Promise<unknown> => await run("git", gitArguments, { cwd: root })
  await git("init", "-q", "-b", BASE_BRANCH)
  await git("config", "user.email", "nobody@example.com")
  await git("config", "user.name", "Nobody")
  await writeFiles(root, BASE_FILES)
  await git("add", ".")
  await git("commit", "-qm", "feat: price an order")
  await git("checkout", "-q", "-b", HEAD_BRANCH)
  await writeFiles(root, HEAD_FILES)
  await git("rm", "-q", DELETED_FILE)
  await git("add", ".")
  await git("commit", "-qm", "feat: discount an order")
  await git("checkout", "-q", BASE_BRANCH)
  return root
}

type TracedEdges = Omit<ImportGraphFile, "importedFilePaths">

const traceFilesInRepository = async (filePath: string): Promise<ImportGraphFile[]> => {
  const { assembleGitAdapter } = await vi.importActual<typeof GitForge>("@flightplan/git-forge")
  const root = await createRepository()
  const assembled = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!assembled.ok) throw assembled.error
  const context = await createImportGraphContext({
    gitAdapter: assembled.gitAdapter,
    baseCommit: BASE_BRANCH,
    headCommit: HEAD_BRANCH,
  })
  return await traceImportGraph(context, filePath)
}

const traceInRepository = async (filePath: string): Promise<TracedEdges[]> => {
  const traced = await traceFilesInRepository(filePath)
  return traced.map(({ filePath: tracedPath, gitSha, diffType, importedBy, importsTo }) => ({ filePath: tracedPath, gitSha, diffType, importedBy, importsTo }))
}

describe("traceImportGraph in a git repository", () => {
  it("gives a traced file the file each of its import specifiers resolves to", async () => {
    const traced = await traceFilesInRepository("apps/shop/src/pricing.ts")
    const pricing = traced.find((file) => file.filePath === "apps/shop/src/pricing.ts")

    expect(new Set(pricing?.importedFilePaths.values())).toStrictEqual(new Set(pricing?.importsTo))
    expect(pricing?.importedFilePaths.size).toBe(pricing?.importsTo.length)
  })

  it("traces a changed file through the commit at the head of the change", async () => {
    expect(await traceInRepository("apps/shop/src/pricing.ts")).toStrictEqual([
      { filePath: "apps/shop/src/Checkout.vue", gitSha: HEAD_BRANCH, diffType: null, importedBy: [], importsTo: ["apps/shop/src/cart/index.ts"] },
      { filePath: "apps/shop/src/cart/index.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["apps/shop/src/Checkout.vue", "apps/shop/src/cart/lines.ts"], importsTo: ["apps/shop/src/pricing.ts"] },
      { filePath: "apps/shop/src/cart/lines.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: [], importsTo: ["apps/shop/src/cart/index.ts"] },
      { filePath: "apps/shop/src/discount.ts", gitSha: HEAD_BRANCH, diffType: "added", importedBy: ["apps/shop/src/pricing.ts"], importsTo: ["packages/money/src/index.ts"] },
      { filePath: "apps/shop/src/pricing.ts", gitSha: HEAD_BRANCH, diffType: "modified", importedBy: ["apps/shop/src/cart/index.ts"], importsTo: ["apps/shop/src/discount.ts", "apps/shop/src/settings/index.ts", "packages/money/src/index.ts"] },
      { filePath: "apps/shop/src/settings/index.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["apps/shop/src/pricing.ts"], importsTo: [] },
      { filePath: "packages/money/src/index.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["apps/shop/src/discount.ts", "apps/shop/src/pricing.ts"], importsTo: ["packages/money/src/round.ts"] },
      { filePath: "packages/money/src/round.ts", gitSha: HEAD_BRANCH, diffType: "modified", importedBy: ["packages/money/src/index.ts"], importsTo: [] },
    ])
  })

  it("finds the importers of a file imported through a package, an alias and a folder", async () => {
    const traced = await traceInRepository("packages/money/src/round.ts")

    expect(traced.map((file) => file.filePath)).toStrictEqual([
      "apps/shop/src/Checkout.vue",
      "apps/shop/src/cart/index.ts",
      "apps/shop/src/cart/lines.ts",
      "apps/shop/src/discount.ts",
      "apps/shop/src/pricing.ts",
      "packages/money/src/index.ts",
      "packages/money/src/round.ts",
    ])
  })

  it("finds the importers of an index file a path alias names", async () => {
    const traced = await traceInRepository("apps/shop/src/settings/index.ts")

    expect(traced.find((file) => file.filePath === "apps/shop/src/settings/index.ts")?.importedBy).toStrictEqual([
      "apps/shop/src/pricing.ts",
    ])
  })

  it("traces a changed Python file through a project that keeps its packages in src", async () => {
    expect(await traceInRepository("services/billing/src/billing/tax.py")).toStrictEqual([
      { filePath: "services/billing/src/billing/__init__.py", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["services/billing/tests/test_invoice.py"], importsTo: ["services/billing/src/billing/invoice.py"] },
      { filePath: "services/billing/src/billing/invoice.py", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["services/billing/src/billing/__init__.py"], importsTo: ["services/billing/src/billing/tax.py"] },
      { filePath: "services/billing/src/billing/tax.py", gitSha: HEAD_BRANCH, diffType: "modified", importedBy: ["services/billing/src/billing/invoice.py"], importsTo: [] },
      { filePath: "services/billing/tests/test_invoice.py", gitSha: HEAD_BRANCH, diffType: null, importedBy: [], importsTo: ["services/billing/src/billing/__init__.py"] },
    ])
  })

  it("traces a deleted file through the commit before the change", async () => {
    expect(await traceInRepository(DELETED_FILE)).toStrictEqual([
      { filePath: DELETED_FILE, gitSha: BASE_BRANCH, diffType: "deleted", importedBy: [], importsTo: ["apps/shop/src/pricing.ts"] },
      { filePath: "apps/shop/src/pricing.ts", gitSha: HEAD_BRANCH, diffType: "modified", importedBy: [DELETED_FILE], importsTo: ["apps/shop/src/settings/index.ts", "packages/money/src/index.ts"] },
      { filePath: "apps/shop/src/settings/index.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["apps/shop/src/pricing.ts"], importsTo: [] },
      { filePath: "packages/money/src/index.ts", gitSha: HEAD_BRANCH, diffType: null, importedBy: ["apps/shop/src/pricing.ts"], importsTo: ["packages/money/src/round.ts"] },
      { filePath: "packages/money/src/round.ts", gitSha: HEAD_BRANCH, diffType: "modified", importedBy: ["packages/money/src/index.ts"], importsTo: [] },
    ])
  })
})
