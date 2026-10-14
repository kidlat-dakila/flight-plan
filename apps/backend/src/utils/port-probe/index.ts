import { lookup } from "node:dns/promises"
import { createServer } from "node:net"

const ANY_PORT = 0

const isAddressFree = async (address: string, port: number): Promise<boolean> =>
  await new Promise((resolve) => {
    const probe = createServer()
    probe.once("error", () => {
      resolve(false)
    })
    probe.listen({ host: address, port }, () => {
      probe.close(() => {
        resolve(true)
      })
    })
  })

const addressesOf = async (host: string): Promise<readonly string[]> =>
  (await lookup(host, { all: true })).map(({ address }) => address)

export const isPortFree = async (host: string, port: number): Promise<boolean> => {
  const addresses = await addressesOf(host)
  const checks = await Promise.all(addresses.map(async (address) => await isAddressFree(address, port)))
  return checks.every(Boolean)
}

export const findFreePort = async (host: string): Promise<number> =>
  await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen({ host, port: ANY_PORT }, () => {
      const address = probe.address()
      probe.close(() => {
        if (address === null || typeof address === "string") reject(new Error("No free port was found."))
        else resolve(address.port)
      })
    })
  })
