import { createServer, type Server } from "node:net"
import { findFreePort, isPortFree } from "@/utils/port-probe"

const HOST = "127.0.0.1"

const listenOn = async (port: number): Promise<Server> =>
  await new Promise((resolve) => {
    const server = createServer()
    server.listen({ host: HOST, port }, () => {
      resolve(server)
    })
  })

const closeServer = async (server: Server): Promise<void> => {
  await new Promise((resolve) => {
    server.close(resolve)
  })
}

describe("port probe", () => {
  it("finds a port nothing listens on", async () => {
    const port = await findFreePort(HOST)

    await expect(isPortFree(HOST, port)).resolves.toBe(true)
  })

  it("says a port is taken while a program listens on it", async () => {
    const port = await findFreePort(HOST)
    const server = await listenOn(port)

    await expect(isPortFree(HOST, port)).resolves.toBe(false)
    await closeServer(server)
  })
})
