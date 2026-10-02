import { mcpUrlOf, readDataPath, readServerConfig } from "@/config"

describe("readServerConfig", () => {
  it("falls back to localhost:3000 when nothing is set", () => {
    expect(readServerConfig({})).toStrictEqual({ host: "localhost", port: 3000 })
  })

  it("reads HOST and PORT", () => {
    expect(readServerConfig({ HOST: "0.0.0.0", PORT: "8080" })).toStrictEqual({ host: "0.0.0.0", port: 8080 })
  })

  it("ignores a PORT that is not a positive integer", () => {
    expect(readServerConfig({ PORT: "abc" }).port).toBe(3000)
  })
})

describe("readDataPath", () => {
  it("falls back to .flightplan in the home folder", () => {
    expect(readDataPath({}, "/Users/dev")).toBe("/Users/dev/.flightplan")
  })

  it("reads FLIGHT_PLAN_DATA_DIR", () => {
    expect(readDataPath({ FLIGHT_PLAN_DATA_DIR: "/work/data" }, "/Users/dev")).toBe("/work/data")
  })
})

describe("mcpUrlOf", () => {
  it("names the MCP endpoint of the server", () => {
    expect(mcpUrlOf({ host: "localhost", port: 3000 })).toBe("http://localhost:3000/mcp")
  })
})
