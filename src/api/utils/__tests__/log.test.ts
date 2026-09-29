import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { errorFields, flushLog, log, logFile, openLog, redactPath } from "../log"
import { jobStatus, startJob } from "../../mcp/jobs"

/** The server's log file: what goes in, what never does, and its size. */
describe("the server log", () => {
  let dir = ""
  let file = ""

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "fp-log-"))
  })
  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  const lines = async (target: string) =>
    (await fs.readFile(target, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>)

  it("should write nothing until a file is named", async () => {
    expect(logFile()).toBeNull()
    log("info", "ignored")
    await flushLog()
    expect(await fs.readdir(dir)).toEqual([])
  })

  it("should append one JSON object per line, in order", async () => {
    file = openLog(path.join(dir, "logs", "server.log"))
    log("info", "server.start", { port: 4100 })
    log("error", "job.failed", { job: "a1", ...errorFields(new Error("out of memory")) })
    await flushLog()
    const [first, second] = await lines(file)
    expect(first).toMatchObject({ level: "info", event: "server.start", port: 4100 })
    expect(typeof first?.["t"]).toBe("string")
    expect(second).toMatchObject({ level: "error", event: "job.failed", job: "a1", error: "out of memory" })
    expect(String(second?.["stack"])).toContain("out of memory")
  })

  it("should log a job's steps and the step it failed in, with the reason", async () => {
    const job = startJob(async (report) => {
      report({ step: "walking the call graph", done: 0, total: 0 })
      report({ step: "walking the call graph", done: 1, total: 0 })
      throw new Error("heap out of memory")
    }, "walkthrough:acme/storefront#412")
    for (let i = 0; i < 100 && jobStatus(job.id)?.state === "running"; i += 1) {
      await new Promise((settle) => setTimeout(settle, 10))
    }
    await flushLog()
    const mine = (await lines(file)).filter((line) => line["job"] === job.id)
    expect(mine.map((line) => line["event"])).toEqual(["job.start", "job.step", "job.failed"])
    expect(mine[2]).toMatchObject({
      subject: "walkthrough:acme/storefront#412",
      step: "walking the call graph",
      error: "heap out of memory",
    })
  })

  it("should never write the MCP token", () => {
    expect(redactPath("/mcp/0f3a9c2e7b1d4f6a8c5e2b9d7a1f3c4e")).toBe("/mcp/…")
    expect(redactPath("/mcp/0f3a9c2e?x=1")).toBe("/mcp/…?x=1")
    expect(redactPath("/api/artifact/sample")).toBe("/api/artifact/sample")
  })

  it("should roll the file over at 5 MB and keep one old copy", async () => {
    const big = "x".repeat(1024 * 1024)
    for (let i = 0; i < 6; i += 1) log("info", "filler", { big })
    await flushLog()
    const sizes = await Promise.all([file, `${file}.1`].map(async (f) => (await fs.stat(f)).size))
    expect(sizes[0]).toBeLessThanOrEqual(5 * 1024 * 1024)
    expect(sizes[1]).toBeGreaterThan(0)
  })
})
