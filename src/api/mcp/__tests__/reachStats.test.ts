import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { flushLog, openLog } from "../../utils/log"
import { buildReach } from "../reach"

const run = promisify(execFile)

/** What a walk did, in the server log: counts and sizes, never a path or a name. */
describe("the reach stats", () => {
  let root = ""
  let file = ""

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fp-reach-stats-"))
    const at = (args: string[]) => run("git", args, { cwd: root })
    const write = async (name: string, text: string) => {
      await fs.mkdir(path.join(root, path.dirname(name)), { recursive: true })
      await fs.writeFile(path.join(root, name), text)
    }
    await at(["init", "-q", "-b", "main"])
    await at(["config", "user.email", "n@e.com"])
    await at(["config", "user.name", "N"])
    await write("src/pricing.ts", "export function priceOf(item) {\n  return item.price\n}\n")
    await write("src/cart.ts", 'import { priceOf } from "./pricing"\nexport function subtotal(items) {\n  return priceOf(items[0])\n}\n')
    await at(["add", "."])
    await at(["commit", "-qm", "base"])
    await at(["checkout", "-q", "-b", "sale"])
    await write("src/pricing.ts", "export function priceOf(item) {\n  if (item.onSale) return item.price * 0.9\n  return item.price\n}\n")
    await at(["commit", "-qam", "sale"])
    file = openLog(path.join(root, "logs", "server.log"))
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  const stats = async () => {
    await flushLog()
    return (await fs.readFile(file, "utf8"))
      .trim()
      .split("\n")
      .filter((line) => line.includes('"reach.stats"'))
  }

  it("should log what a finished walk read, searched and parsed", async () => {
    await buildReach({ root, base: "main", head: "sale" })
    const [line] = await stats()
    expect(JSON.parse(line ?? "{}")).toMatchObject({
      outcome: "done",
      repoFiles: 2,
      changedFiles: 1,
      declarations: 1,
      roots: 1,
    })
    const fields = JSON.parse(line ?? "{}") as Record<string, number>
    expect(fields["reads"]).toBeGreaterThan(0)
    // A TypeScript walk finds candidate callers in the import graph, read in
    // one batch, and searches for none.
    expect(fields["batchReads"]).toBeGreaterThan(0)
    expect(fields["graphFiles"]).toBe(2)
    expect(fields["searches"]).toBe(0)
    expect(fields["parses"]).toBeGreaterThan(0)
    expect(fields["rssMb"]).toBeGreaterThan(0)
    expect(line).not.toMatch(/pricing|cart|priceOf|subtotal/)
  })
})
