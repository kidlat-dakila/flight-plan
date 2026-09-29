import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { buildMultiLanguageDiagram } from "../../codegraph/buildMultiLanguageDiagram"
import { afterAll, describe, expect, it } from "vitest"
import { reviewRepo } from "../reviewRepo"

const run = promisify(execFile)
const made: string[] = []

afterAll(async () => {
  await Promise.all(made.map((root) => fs.rm(root, { recursive: true, force: true })))
})

/**
 * A real repo: `main` has pricing (+ a barrel) and a cart that calls priceOf
 * through the barrel; the branch changes priceOf's body and adds a new caller.
 */
async function repository(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-review-"))
  made.push(root)
  const at = (args: string[]) => run("git", args, { cwd: root })
  const write = async (file: string, text: string) => {
    await fs.mkdir(path.join(root, path.dirname(file)), { recursive: true })
    await fs.writeFile(path.join(root, file), text)
  }

  await at(["init", "-q", "-b", "main"])
  await at(["config", "user.email", "n@e.com"])
  await at(["config", "user.name", "N"])

  await write("src/pricing.ts", "export function priceOf(item) {\n  return item.price\n}\n")
  await write("src/index.ts", 'export * from "./pricing"\n')
  await write(
    "src/cart.ts",
    'import { priceOf } from "./index"\nexport function subtotal(items) {\n  return priceOf(items[0])\n}\n',
  )
  await at(["add", "."])
  await at(["commit", "-qm", "base"])

  await at(["checkout", "-q", "-b", "sale"])
  // Change priceOf's body...
  await write(
    "src/pricing.ts",
    "export function priceOf(item) {\n  if (item.onSale) return item.price * 0.9\n  return item.price\n}\n",
  )
  // ...and add a brand-new caller file the base does not have.
  await write(
    "src/report.ts",
    'import { priceOf } from "./pricing"\nexport function report(item) {\n  return priceOf(item)\n}\n',
  )
  await at(["add", "."])
  await at(["commit", "-qm", "sale pricing"])
  await at(["checkout", "-q", "main"])

  return root
}

/**
 * A real repo with both a TypeScript and a Python side: `main` has the same
 * pricing/cart pair as {@link repository} plus a Python pricing/checkout pair;
 * the branch changes both `priceOf` and `price_of`.
 */
async function mixedRepository(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-review-mixed-"))
  made.push(root)
  const at = (args: string[]) => run("git", args, { cwd: root })
  const write = async (file: string, text: string) => {
    await fs.mkdir(path.join(root, path.dirname(file)), { recursive: true })
    await fs.writeFile(path.join(root, file), text)
  }

  await at(["init", "-q", "-b", "main"])
  await at(["config", "user.email", "n@e.com"])
  await at(["config", "user.name", "N"])

  await write("src/pricing.ts", "export function priceOf(item) {\n  return item.price\n}\n")
  await write(
    "src/cart.ts",
    'import { priceOf } from "./pricing"\nexport function subtotal(items) {\n  return priceOf(items[0])\n}\n',
  )
  await write("pkg/__init__.py", "")
  await write("pkg/pricing.py", "def price_of():\n    return 1\n")
  await write(
    "pkg/checkout.py",
    "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
  )
  await at(["add", "."])
  await at(["commit", "-qm", "base"])

  await at(["checkout", "-q", "-b", "sale"])
  await write(
    "src/pricing.ts",
    "export function priceOf(item) {\n  if (item.onSale) return item.price * 0.9\n  return item.price\n}\n",
  )
  await write("pkg/pricing.py", "def price_of():\n    return 2\n")
  await at(["add", "."])
  await at(["commit", "-qm", "sale pricing, both languages"])
  await at(["checkout", "-q", "main"])

  return root
}

describe("reviewRepo", () => {
  it("lists the changed files with head-side line ranges", async () => {
    const root = await repository()
    const { files } = await reviewRepo({ root, base: "main", head: "sale" })
    const byPath = Object.fromEntries(files.map((one) => [one.path, one.changes]))
    expect(Object.keys(byPath).sort()).toEqual(["src/pricing.ts", "src/report.ts"])
    // priceOf's changed body sits on line 2 of the head version.
    expect(byPath["src/pricing.ts"]?.some(([a, b]) => a <= 2 && 2 <= b)).toBe(true)
  })

  it("reads a changed file from head and an unchanged one from base", async () => {
    const root = await repository()
    const { base } = await reviewRepo({ root, base: "main", head: "sale" })
    expect(await base.read("src/pricing.ts")).toContain("onSale") // head version
    expect(await base.read("src/cart.ts")).toContain("subtotal") // base, unchanged
    expect(base.files.has("src/report.ts")).toBe(true) // branch-added file present
  })

  it("reads many files in a batch exactly as it reads them one at a time", async () => {
    const root = await repository()
    const one = (await reviewRepo({ root, base: "main", head: "sale" })).base
    const many = (await reviewRepo({ root, base: "main", head: "sale" })).base
    const paths = ["src/pricing.ts", "src/cart.ts", "src/report.ts", "src/index.ts", "src/missing.ts"]
    const batch = await many.readAll?.(paths)
    expect(batch).toBeDefined()
    for (const file of paths) expect(batch?.get(file) ?? null).toBe(await one.read(file))
    expect(batch?.has("src/missing.ts")).toBe(false)
    // What the batch read is what a later single read gives.
    expect(await many.read("src/report.ts")).toBe(batch?.get("src/report.ts"))
  })

  it("drives buildMultiLanguageDiagram end to end, resolving through the barrel", async () => {
    const root = await repository()
    const { base, candidates, files } = await reviewRepo({ root, base: "main", head: "sale" })
    const diagram = await buildMultiLanguageDiagram({ base, candidates, files })

    const root0 = diagram.find((node) => node.code.name === "priceOf")
    expect(root0).toBeDefined()
    const callerNames = root0!.callers.map((one) => one.code.name).sort()
    // subtotal reaches priceOf through the barrel; report is the new caller.
    expect(callerNames).toEqual(["report", "subtotal"])
    expect((root0!.executionSteps?.length ?? 0)).toBeGreaterThan(0)
  })

  it("dispatches a mixed TS+Python change to both tracers through buildMultiLanguageDiagram", async () => {
    const root = await mixedRepository()
    const { base, candidates, files } = await reviewRepo({ root, base: "main", head: "sale" })
    const diagram = await buildMultiLanguageDiagram({ base, candidates, files })

    const tsRoot = diagram.find((node) => node.code.name === "priceOf")
    const pyRoot = diagram.find((node) => node.code.name === "price_of")
    expect(tsRoot).toBeDefined()
    expect(pyRoot).toBeDefined()
    expect(tsRoot!.code.file).toBe("src/pricing.ts")
    expect(pyRoot!.code.file).toBe("pkg/pricing.py")
  })
})
