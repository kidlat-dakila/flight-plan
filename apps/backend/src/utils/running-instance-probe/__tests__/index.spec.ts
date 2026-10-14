import { createServer, type Server } from "node:http"
import { findFreePort } from "@/utils/port-probe"
import { isFlightPlanRunning } from "@/utils/running-instance-probe"

const HOST = "127.0.0.1"

const serveJson = async (port: number, body: unknown): Promise<Server> =>
  await new Promise((resolve) => {
    const server = createServer((_request, response) => {
      response.setHeader("content-type", "application/json")
      response.end(JSON.stringify(body))
    })
    server.listen({ host: HOST, port }, () => {
      resolve(server)
    })
  })

const urlOf = (port: number): string => `http://${HOST}:${String(port)}`

const closeServer = async (server: Server): Promise<void> => {
  await new Promise((resolve) => {
    server.close(resolve)
  })
}

describe("isFlightPlanRunning", () => {
  it("recognises a server that answers the health query", async () => {
    const port = await findFreePort(HOST)
    const server = await serveJson(port, { result: { data: { status: "ok" } } })

    await expect(isFlightPlanRunning(urlOf(port))).resolves.toBe(true)
    await closeServer(server)
  })

  it("does not take another program's server for Flight Plan", async () => {
    const port = await findFreePort(HOST)
    const server = await serveJson(port, { message: "hello" })

    await expect(isFlightPlanRunning(urlOf(port))).resolves.toBe(false)
    await closeServer(server)
  })

  it("finds nothing at an address no program listens on", async () => {
    const port = await findFreePort(HOST)

    await expect(isFlightPlanRunning(urlOf(port))).resolves.toBe(false)
  })
})
