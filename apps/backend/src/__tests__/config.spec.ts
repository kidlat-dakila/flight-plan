import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  DEFAULT_HOST,
  DEVELOPMENT_PORT,
  mcpUrlOf,
  planPort,
  preferredPortOf,
  readDataPath,
  readHost,
  readRequestedPort,
  serverUrlOf,
} from "@/config"
import { buildMcpManifest } from "@/procedures/save-setup-step/utils/claude-plugin"

const PLUGIN_MCP_MANIFEST_PATH = fileURLToPath(new URL("../../../../plugin/.mcp.json", import.meta.url))

describe("readHost", () => {
  it("falls back to localhost", () => {
    expect(readHost({})).toBe("localhost")
  })

  it("reads HOST", () => {
    expect(readHost({ HOST: "0.0.0.0" })).toBe("0.0.0.0")
  })
})

describe("readRequestedPort", () => {
  it("requests no port when PORT is not set", () => {
    expect(readRequestedPort({})).toBeNull()
  })

  it("reads PORT", () => {
    expect(readRequestedPort({ PORT: "8080" })).toBe(8080)
  })

  it.each(["abc", "0", "-1", "80.5", "65536"])("ignores the PORT %s", (rawPort) => {
    expect(readRequestedPort({ PORT: rawPort })).toBeNull()
  })
})

describe("preferredPortOf", () => {
  it("is the published port before any port was saved", () => {
    expect(preferredPortOf({ requestedPort: null, savedPort: null })).toBe(24747)
  })

  it("is the saved port, so the address stays the same between runs", () => {
    expect(preferredPortOf({ requestedPort: null, savedPort: 51000 })).toBe(51000)
  })

  it("is the requested port over the saved one", () => {
    expect(preferredPortOf({ requestedPort: 8080, savedPort: 51000 })).toBe(8080)
  })
})

describe("planPort", () => {
  it("listens on the preferred port when it is free", () => {
    expect(planPort({ requestedPort: null, savedPort: 51000 }, true)).toStrictEqual({ kind: "listen", port: 51000 })
  })

  it("looks for a free port when the preferred one is taken and none was requested", () => {
    expect(planPort({ requestedPort: null, savedPort: null }, false)).toStrictEqual({ kind: "find-free-port" })
  })

  it("refuses a requested port that is taken", () => {
    expect(planPort({ requestedPort: 8080, savedPort: null }, false)).toStrictEqual({
      kind: "refuse",
      message: "Port 8080 is in use by another program. Choose another one with --port.",
    })
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
  it("points at the development server's address, so the plugin connects before setup rewrites it", async () => {
    const manifest: unknown = JSON.parse(await readFile(PLUGIN_MCP_MANIFEST_PATH, "utf8"))

    expect(manifest).toStrictEqual(buildMcpManifest(mcpUrlOf({ host: DEFAULT_HOST, port: DEVELOPMENT_PORT })))
  })
})
