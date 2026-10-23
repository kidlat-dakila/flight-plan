import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { readTroubleshootRequest } from "@/procedures/read-troubleshoot-request"
import { readTroubleshootRequestInputShape } from "@/procedures/read-troubleshoot-request/utils/schemas"
import { recordingFailures } from "@/server/mcp/tool-failures"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Returns what the user asked Flight Plan to troubleshoot, by the id after /flightplan:troubleshoot.",
  "`request` is what the user wrote and the page they asked from, `error` is the error they asked about, and `recentErrors` are the latest errors Flight Plan logged before they asked.",
  "Every log is already stripped of tokens, emails, the user name and the home folder.",
  "`flightPlan` gives the running version and where its source and docs are on GitHub at that version, and `issue` where a bug in Flight Plan is reported.",
].join(" ")

export const registerTroubleshootTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "troubleshoot",
    { description: DESCRIPTION, inputSchema: readTroubleshootRequestInputShape },
    recordingFailures(context.errorLog, "troubleshoot", async (input) => {
      const reading = await readTroubleshootRequest(input, context)
      return reading.kind === "read" ? jsonResult(reading.report) : errorResult(reading.message)
    }),
  )
}
