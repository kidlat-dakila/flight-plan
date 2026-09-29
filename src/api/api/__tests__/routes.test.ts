import * as assert from "assert"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { serveHttp } from "../../mcp/server"
import { writeConfig } from "../../mcp/config"
import { walkthroughName } from "../../mcp/documentId"
import { recordCheckout } from "../../mcp/checkouts"
import { storeSample } from "../../utils/samples/store"
import { SAMPLE_MISSING, SAMPLE_REVIEWED } from "../../utils/samples/index"
import { memoryStore } from "../../utils/reviewed/store"
import { createInstalledBackend } from "../installed"
import { DRAFTING_IDLE_MS, DRAFTING_TICK_MS, createSampleBackend } from "../sample"
import { routes } from "../protocol"
import type { Backend } from "../backend"

/**
 * The HTTP API, against a real listener: status codes, CORS and id decoding
 * are what a client sees, and only a real request shows them.
 */

async function serve(api: Backend): Promise<{ base: string; close: () => Promise<void> }> {
  const server = await serveHttp(0, null, false, api)
  return { base: `http://127.0.0.1:${String(server.port)}`, close: server.close }
}

suite("http api, sample mode", () => {
  let base = ""
  let close: (() => Promise<void>) | null = null
  let clock = 0

  beforeAll(async () => {
    const served = await serve(createSampleBackend({ reviewed: memoryStore(), now: () => clock }))
    base = served.base
    close = served.close
  })
  afterAll(async () => {
    await close?.()
  })

  const get = (route: string) => fetch(`${base}${route}`)

  test("serves a sample as the stored JSON, open to every origin", async () => {
    const response = await get(routes.artifact("sample"))
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.headers.get("access-control-allow-origin"), "*")
    const body = (await response.json()) as { meta: { kind: string } }
    const { document } = await storeSample("walkthrough")
    assert.deepStrictEqual(body, JSON.parse(JSON.stringify(document)))
    assert.strictEqual(body.meta.kind, "walkthrough")
  })

  test("serves the setup samples, and nothing else under setup", async () => {
    const byDefault = await get(routes.setup("sample"))
    assert.strictEqual(byDefault.status, 200)
    const state = (await byDefault.json()) as { steps: { id: string }[] }
    assert.deepStrictEqual(state.steps.map((step) => step.id), ["plugin", "forge", "server", "connect"])
    assert.strictEqual((await get(routes.setup("sample/fresh"))).status, 200)
    assert.strictEqual((await get(routes.setup("sample/nope"))).status, 404)
    assert.strictEqual((await get(routes.setup("walkthrough/acme/storefront/pr-412"))).status, 404)
  })

  test("answers a preflight", async () => {
    const response = await fetch(`${base}${routes.reviewed("sample")}`, { method: "OPTIONS" })
    assert.strictEqual(response.status, 204)
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /POST/)
  })

  test("serves the panel states that are not a document", async () => {
    const missing = await get(routes.artifact("sample/missing"))
    assert.strictEqual(missing.status, 404)
    assert.deepStrictEqual(await missing.json(), { state: "missing", missing: SAMPLE_MISSING })
    const failed = await get(routes.artifact("sample/failed"))
    assert.strictEqual(failed.status, 500)
    assert.strictEqual(((await failed.json()) as { state: string }).state, "failed")
  })

  test("holds the waiting sample open", async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, 300)
    const outcome = await fetch(`${base}${routes.artifact("sample/waiting")}`, { signal: controller.signal }).then(
      () => "answered",
      () => "held",
    )
    clearTimeout(timer)
    assert.strictEqual(outcome, "held")
  })

  test("refuses a stored id, an unknown sample and an unknown route", async () => {
    assert.strictEqual((await get(routes.artifact("walkthrough/acme/storefront/pr-1"))).status, 404)
    assert.strictEqual((await get(routes.artifact("sample/nope"))).status, 404)
    assert.strictEqual((await get("/api/nope")).status, 404)
    assert.strictEqual((await fetch(`${base}${routes.artifact("sample")}`, { method: "POST" })).status, 405)
  })

  test("serves the context, with a fake adapter", async () => {
    const context = (await (await get(routes.context("sample"))).json()) as {
      header: { kind: string }
      coverage: { total: number }
      links: { anchors: Record<string, string> }
    }
    assert.strictEqual(context.header.kind, "review")
    assert.ok(context.coverage.total > 0)
    assert.ok(Object.keys(context.links.anchors).length > 0)
    const bare = (await (await get(`${routes.context("sample")}?bare`)).json()) as { header: { kind: string } }
    assert.strictEqual(bare.header.kind, "bare")
    const stale = (await (await get(`${routes.context("sample")}?stale=git`)).json()) as { notice: { text: string } }
    assert.match(stale.notice.text, /git/)
  })

  test("serves the fake files, whatever the commit, and nothing else", async () => {
    const file = await get(routes.file("acme/storefront", "0000000", "src/checkout/placeOrder.ts"))
    assert.strictEqual(file.status, 200)
    assert.match(await file.text(), /export async function placeOrder/)
    assert.strictEqual((await get(routes.file("acme/storefront", null, "../../etc/passwd"))).status, 404)
    assert.strictEqual((await get("/api/file?repo=acme/storefront")).status, 400)
  })

  test("drafting fills in over time, restarts after a pause, and holds a step", async () => {
    const statusAt = async (at: number, query = ""): Promise<{ status: string; files: number }> => {
      clock = at
      const body = (await (await get(`${routes.artifact("sample/drafting")}${query}`)).json()) as {
        meta: { status: string }
        codeWalkthrough: { files: unknown[] }
      }
      return { status: body.meta.status, files: body.codeWalkthrough.files.length }
    }
    const first = await statusAt(1_000_000)
    assert.strictEqual(first.status, "drafting")
    let at = 1_000_000
    let last = first
    for (let step = 0; step < 20 && last.status !== "complete"; step += 1) {
      at += DRAFTING_TICK_MS
      last = await statusAt(at)
    }
    assert.strictEqual(last.status, "complete")
    assert.deepStrictEqual(await statusAt(at + DRAFTING_IDLE_MS + 1), first, "a pause starts it again")
    assert.strictEqual((await statusAt(at, "?step=0")).status, "drafting")
    assert.strictEqual((await get(`${routes.artifact("sample/drafting")}?step=99`)).status, 400)
  })

  test("seeds the samples' reviewed marks, then marks and unmarks", async () => {
    const seed = SAMPLE_REVIEWED["walkthrough"]
    const state = (await (await get(routes.reviewed("sample"))).json()) as { waypoints: string[]; files: string[] }
    for (const id of seed?.waypoints ?? []) assert.ok(state.waypoints.includes(id), id)
    for (const file of seed?.files ?? []) assert.ok(state.files.includes(file), file)

    const post = (body: unknown) =>
      fetch(`${base}${routes.reviewed("sample")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    const marked = (await (await post({ op: "mark", waypoint: "reservation-lapses" })).json()) as { waypoints: string[] }
    assert.ok(marked.waypoints.includes("reservation-lapses"))
    const unmarked = (await (await post({ op: "unmark", file: "src/checkout/errors.ts" })).json()) as { files: string[] }
    assert.ok(!unmarked.files.includes("src/checkout/errors.ts"))
    const again = (await (await get(routes.reviewed("sample"))).json()) as { waypoints: string[] }
    assert.ok(again.waypoints.includes("reservation-lapses"), "the change was stored")
    assert.strictEqual((await post({ op: "toggle" })).status, 400)
    assert.strictEqual((await post({ op: "mark", waypoint: "x" }).then(() => get(routes.reviewed("sample/missing")))).status, 404)
  })

  test("leaves the MCP route off", async () => {
    assert.strictEqual((await fetch(`${base}/mcp/anything`, { method: "POST", body: "{}" })).status, 404)
  })
})

suite("http api, installed", () => {
  let base = ""
  let close: (() => Promise<void>) | null = null
  let temporary = ""
  let checkout = ""
  const branch = "feature/checkout-v2"

  beforeAll(async () => {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), "fp-http-"))
    const server = path.join(temporary, "server")
    checkout = path.join(temporary, "checkout")
    const walkthroughs = path.join(temporary, "walkthroughs")
    await writeConfig(server, { version: 1, walkthroughRoot: walkthroughs, planRoot: path.join(temporary, "plans") })
    await recordCheckout(server, "acme/storefront", checkout)
    await fs.mkdir(path.join(checkout, "src"), { recursive: true })
    await fs.writeFile(path.join(checkout, "src", "a.ts"), "export const a = 1\n")
    await fs.writeFile(path.join(temporary, "secret.txt"), "not yours\n")

    const { document } = await storeSample("walkthrough")
    const name = walkthroughName({ kind: "branch", name: branch })
    await fs.mkdir(path.join(walkthroughs, "acme", "storefront"), { recursive: true })
    await fs.writeFile(path.join(walkthroughs, "acme", "storefront", `${name}.json`), JSON.stringify(document))
    await fs.writeFile(path.join(walkthroughs, "acme", "storefront", "pr-9.json"), "not json")

    const reviewed = memoryStore()
    const served = await serve(
      createInstalledBackend({ serverDirectory: server, reviewed, samples: createSampleBackend({ reviewed }) }),
    )
    base = served.base
    close = served.close
  })
  afterAll(async () => {
    await close?.()
    await fs.rm(temporary, { recursive: true, force: true })
  })

  const get = (route: string) => fetch(`${base}${route}`)
  const branchId = `walkthrough/acme/storefront/${walkthroughName({ kind: "branch", name: branch })}`

  test("reads a stored walkthrough by its id, with the branch escape intact", async () => {
    assert.match(routes.artifact(branchId), /%252F/)
    const response = await get(routes.artifact(branchId))
    assert.strictEqual(response.status, 200)
    assert.strictEqual(((await response.json()) as { meta: { kind: string } }).meta.kind, "walkthrough")
  })

  test("says missing for a walkthrough nobody stored, and failed for one it cannot read", async () => {
    const missing = await get(routes.artifact("walkthrough/acme/storefront/pr-7"))
    assert.strictEqual(missing.status, 404)
    const body = (await missing.json()) as { state: string; missing: { number: number } }
    assert.strictEqual(body.state, "missing")
    assert.strictEqual(body.missing.number, 7)
    const failed = await get(routes.artifact("walkthrough/acme/storefront/pr-9"))
    assert.strictEqual(failed.status, 500)
    assert.strictEqual(((await failed.json()) as { state: string }).state, "failed")
  })

  test("refuses an id that is not one", async () => {
    assert.strictEqual((await get("/api/artifact/walkthrough/acme/storefront/../pr-1")).status, 404)
    assert.strictEqual((await get(routes.artifact("walkthrough/acme/storefront/notes"))).status, 404)
  })

  test("serves context from the checkout with plain git, and prompts", async () => {
    const context = (await (await get(routes.context(branchId))).json()) as { prompts: { update: string } | null }
    assert.ok(context.prompts?.update.includes(branch))
  })

  test("reads files only from a recorded checkout, and only inside it", async () => {
    const file = await get(routes.file("acme/storefront", null, "src/a.ts"))
    assert.strictEqual(file.status, 200)
    assert.strictEqual(await file.text(), "export const a = 1\n")
    assert.strictEqual((await get(routes.file("acme/storefront", null, "../secret.txt"))).status, 403)
    assert.strictEqual((await get(routes.file("acme/elsewhere", null, "src/a.ts"))).status, 403)
    assert.strictEqual((await get(routes.file("acme/storefront", "not-a-sha", "src/a.ts"))).status, 400)
  })

  test("still serves the samples", async () => {
    assert.strictEqual((await get(routes.artifact("sample/plan"))).status, 200)
  })
})
