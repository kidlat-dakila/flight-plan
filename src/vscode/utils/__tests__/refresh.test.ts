import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { refreshServerCopy } from "../setupInstall"

/** An upgrade must not keep running the previous server. */
describe("refreshing the installed server", () => {
  let dir = ""
  let bundled = ""
  let installed = ""

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "fp-refresh-"))
    bundled = path.join(dir, "bundled.mjs")
    installed = path.join(dir, "server", "mcp-server.mjs")
    await fs.writeFile(bundled, "// server 0.1.0\n")
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it("should replace an older copy with the bundled server", async () => {
    await fs.mkdir(path.dirname(installed), { recursive: true })
    await fs.writeFile(installed, "// server 0.0.116\n")
    expect(await refreshServerCopy(bundled, installed)).toBe(true)
    expect(await fs.readFile(installed, "utf8")).toBe("// server 0.1.0\n")
  })

  it("should leave a copy that is already current alone", async () => {
    await fs.mkdir(path.dirname(installed), { recursive: true })
    await fs.writeFile(installed, "// server 0.1.0\n")
    const before = (await fs.stat(installed)).mtimeMs
    expect(await refreshServerCopy(bundled, installed)).toBe(false)
    expect((await fs.stat(installed)).mtimeMs).toBe(before)
  })

  it("should not install a server that was never installed", async () => {
    expect(await refreshServerCopy(bundled, installed)).toBe(false)
    await expect(fs.stat(installed)).rejects.toThrow()
  })
})
