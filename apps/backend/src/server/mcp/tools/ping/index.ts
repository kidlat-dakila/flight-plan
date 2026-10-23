import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { recordPing } from "@/procedures/record-ping"
import { recordPingInputShape } from "@/procedures/record-ping/utils/schemas"
import { recordingFailures } from "@/server/mcp/tool-failures"

const DESCRIPTION
  = "Tell Flight Plan you are still online for a review. Call it at least every 5 seconds while you work without calling Flight Plan's other tools, which count as well."

export const registerPingTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "ping",
    { description: DESCRIPTION, inputSchema: recordPingInputShape },
    recordingFailures(context.errorLog, "ping", async (input) => {
      const recording = await recordPing(input, context)
      return recording.kind === "recorded"
        ? { content: [{ type: "text", text: recording.note }] }
        : { content: [{ type: "text", text: recording.message }], isError: true }
    }),
  )
}
