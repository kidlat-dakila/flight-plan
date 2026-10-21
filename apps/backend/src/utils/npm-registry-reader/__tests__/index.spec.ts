import { createServer, type Server } from "node:http"
import { createLatestVersionReader, latestManifestUrlOf } from "@/utils/npm-registry-reader"
import { findFreePort } from "@/utils/port-probe"

const HOST = "127.0.0.1"
const SHORT_TIMEOUT_MS = 50
const SLOW_ANSWER_MS = 500

interface Answer {
  readonly status: number
  readonly body: string
  readonly delayMs?: number
}

const serve = async (answer: Answer): Promise<{ readonly server: Server, readonly url: string, readonly requestCount: () => number }> => {
  const port = await findFreePort(HOST)
  const onRequest = vi.fn()
  const server = createServer((_request, response) => {
    onRequest()
    setTimeout(() => {
      response.writeHead(answer.status, { "content-type": "application/json" })
      response.end(answer.body)
    }, answer.delayMs ?? 0)
  })
  await new Promise<void>((resolve) => {
    server.listen({ host: HOST, port }, resolve)
  })
  return { server, url: `http://${HOST}:${String(port)}/latest`, requestCount: () => onRequest.mock.calls.length }
}

const closeServer = async (server: Server): Promise<void> => {
  server.closeAllConnections()
  await new Promise((resolve) => {
    server.close(resolve)
  })
}

describe("latestManifestUrlOf", () => {
  it("asks npm for the latest version of the package", () => {
    expect(latestManifestUrlOf("@kidlat-dakila/flightplan")).toBe("https://registry.npmjs.org/@kidlat-dakila/flightplan/latest")
  })
})

describe("createLatestVersionReader", () => {
  it("reads the version of the latest manifest", async () => {
    const { server, url } = await serve({ status: 200, body: JSON.stringify({ name: "@kidlat-dakila/flightplan", version: "0.2.0" }) })

    await expect(createLatestVersionReader({ manifestUrl: url })()).resolves.toBe("0.2.0")
    await closeServer(server)
  })

  it.each([
    { status: 404, body: JSON.stringify({ error: "Not found" }) },
    { status: 200, body: JSON.stringify({ name: "@kidlat-dakila/flightplan" }) },
    { status: 200, body: "<html>" },
  ])("reads no version from a $status answer of $body", async (answer) => {
    const { server, url } = await serve(answer)

    await expect(createLatestVersionReader({ manifestUrl: url })()).resolves.toBeNull()
    await closeServer(server)
  })

  it("gives up when the registry is slower than the timeout", async () => {
    const { server, url } = await serve({ status: 200, body: JSON.stringify({ version: "0.2.0" }), delayMs: SLOW_ANSWER_MS })

    await expect(createLatestVersionReader({ manifestUrl: url, timeoutMs: SHORT_TIMEOUT_MS })()).resolves.toBeNull()
    await closeServer(server)
  })

  it("reads no version when nothing answers", async () => {
    const port = await findFreePort(HOST)

    await expect(createLatestVersionReader({ manifestUrl: `http://${HOST}:${String(port)}/latest` })()).resolves.toBeNull()
  })

  it("sends one request for reads made while one is underway", async () => {
    const { server, url, requestCount } = await serve({ status: 200, body: JSON.stringify({ version: "0.2.0" }), delayMs: SHORT_TIMEOUT_MS })
    const readLatestVersion = createLatestVersionReader({ manifestUrl: url })

    await expect(Promise.all([readLatestVersion(), readLatestVersion()])).resolves.toStrictEqual(["0.2.0", "0.2.0"])
    expect(requestCount()).toBe(1)
    await expect(readLatestVersion()).resolves.toBe("0.2.0")
    expect(requestCount()).toBe(2)
    await closeServer(server)
  })
})
