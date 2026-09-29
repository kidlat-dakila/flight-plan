import { describe, expect, it } from "vitest"
import { bridgeUrl, type BridgeReply, type BridgeRequest } from "../../../api/api/protocol"
import { ApiError, shouldRetry } from "../api"
import { bridgeTransport, isBridgeReply } from "../bridge"

/** The webview's API requests, carried by the extension. */
describe("the webview's bridge to the API", () => {
  const wire = () => {
    const sent: BridgeRequest[] = []
    let reply: (message: BridgeReply) => void = () => undefined
    const transport = bridgeTransport(
      (request) => sent.push(request),
      (onReply) => {
        reply = onReply
      },
    )
    return { sent, transport, reply: (message: BridgeReply) => reply(message) }
  }

  it("should turn a reply into the response the queries read, matched by id", async () => {
    const { sent, transport, reply } = wire()
    const first = transport("/api/theme", { method: "GET" })
    const second = transport("/api/reviewed/sample", { method: "POST", body: '{"op":"mark"}' })
    expect(sent).toEqual([
      { type: "api", id: 0, method: "GET", route: "/api/theme" },
      { type: "api", id: 1, method: "POST", route: "/api/reviewed/sample", body: '{"op":"mark"}' },
    ])
    // Out of order, as replies may come.
    reply({ type: "apiReply", id: 1, status: 404, contentType: "application/json", body: '{"error":"no"}' })
    reply({ type: "apiReply", id: 0, status: 200, contentType: "application/json", body: '{"theme":"dark-plus"}' })
    const a = await first
    const b = await second
    expect(a.status).toBe(200)
    expect(await a.json()).toEqual({ theme: "dark-plus" })
    expect(b.ok).toBe(false)
    expect(await b.json()).toEqual({ error: "no" })
  })

  it("should fail at once when the server is not running, and be retried when it did not answer", async () => {
    const { transport, reply } = wire()
    const down = transport("/api/theme", { method: "GET" })
    const silent = transport("/api/theme", { method: "GET" })
    reply({ type: "apiReply", id: 0, error: "The Flight Plan server is not running.", final: true })
    reply({ type: "apiReply", id: 1, error: "The Flight Plan server did not answer.", final: false })
    const first = (await down.catch((cause: unknown) => cause)) as ApiError
    const second = (await silent.catch((cause: unknown) => cause)) as ApiError
    expect(first).toBeInstanceOf(ApiError)
    expect(first.message).toContain("not running")
    expect(shouldRetry(0, first)).toBe(false)
    expect(shouldRetry(0, second)).toBe(true)
  })

  it("should stop waiting when a query is cancelled", async () => {
    const { transport, reply } = wire()
    const controller = new AbortController()
    const pending = transport("/api/theme", { method: "GET", signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toBeDefined()
    // A late reply is dropped.
    reply({ type: "apiReply", id: 0, status: 200, contentType: "text/plain", body: "late" })
  })

  it("should know its replies from the page's other messages", () => {
    expect(isBridgeReply({ type: "apiReply", id: 3, error: "x", final: true })).toBe(true)
    expect(isBridgeReply({ type: "theme", theme: "dark-plus" })).toBe(false)
    expect(isBridgeReply(null)).toBe(false)
  })

  it("should send only API routes, and only to the server's own origin", () => {
    const origin = "http://127.0.0.1:45433"
    expect(bridgeUrl(origin, "/api/artifact/sample?step=3")).toBe("http://127.0.0.1:45433/api/artifact/sample?step=3")
    expect(bridgeUrl(origin, "/mcp/token")).toBeNull()
    expect(bridgeUrl(origin, "//example.com/api/x")).toBeNull()
    expect(bridgeUrl(origin, "/api/../mcp/token")).toBeNull()
    expect(bridgeUrl(origin, "https://example.com/api/x")).toBeNull()
  })
})
