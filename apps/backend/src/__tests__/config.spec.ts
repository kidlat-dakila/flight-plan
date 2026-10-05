import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { mcpUrlOf, readDataPath, readServerConfig, serverUrlOf } from "@/config"
import { buildMcpManifest } from "@/procedures/save-setup-step/utils/claude-plugin"

const PLUGIN_MCP_MANIFEST_PATH = fileURLToPath(new URL("../../../../plugin/.mcp.json", import.meta.url))

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

describe("serverUrlOf", () => {
  it("names the base address of the server", () => {
    expect(serverUrlOf({ host: "localhost", port: 4100 })).toBe("http://localhost:4100")
  })
})

describe("the plugin's own MCP manifest", () => {
  it("points at the server's default address, so the plugin connects before setup rewrites it", async () => {
    const manifest: unknown = JSON.parse(await readFile(PLUGIN_MCP_MANIFEST_PATH, "utf8"))

    expect(manifest).toStrictEqual(buildMcpManifest(mcpUrlOf(readServerConfig({}))))
  })
})
