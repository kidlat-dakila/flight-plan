import { readServerConfig } from "./config"

describe("readServerConfig", () => {
  it("falls back to localhost:3000 when nothing is set", () => {
    expect(readServerConfig({})).toEqual({ host: "localhost", port: 3000 })
  })

  it("reads HOST and PORT", () => {
    expect(readServerConfig({ HOST: "0.0.0.0", PORT: "8080" })).toEqual({ host: "0.0.0.0", port: 8080 })
  })

  it("ignores a PORT that is not a positive integer", () => {
    expect(readServerConfig({ PORT: "abc" }).port).toBe(3000)
  })
})
