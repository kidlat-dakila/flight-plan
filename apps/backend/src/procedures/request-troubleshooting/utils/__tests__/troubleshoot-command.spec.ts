import { buildTroubleshootCommand } from "@/procedures/request-troubleshooting/utils/troubleshoot-command"

describe("buildTroubleshootCommand", () => {
  it("starts Claude with the default model and effort when nothing else is chosen", () => {
    expect(buildTroubleshootCommand({ workingPath: "/Users/o'neil/.flightplan/logs", requestId: "20261023-142530-000001", model: "default", effort: "default" })).toBe(
      String.raw`cd '/Users/o'\''neil/.flightplan/logs' && claude '/flightplan:troubleshoot 20261023-142530-000001' '--allowedTools' 'mcp__plugin_flightplan_flightplan__*' 'WebFetch(domain:github.com)' 'WebFetch(domain:raw.githubusercontent.com)'`,
    )
  })

  it("passes the chosen model and effort", () => {
    expect(buildTroubleshootCommand({ workingPath: "/logs", requestId: "20261023-142530-000001", model: "sonnet", effort: "high" })).toContain("'--model' 'sonnet' '--effort' 'high'")
  })
})
