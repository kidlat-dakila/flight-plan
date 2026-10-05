import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { readNodes } from "@/procedures/read-nodes"
import { readNodesInputShape } from "@/procedures/read-nodes/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Selects waypoints, File Sections and diagram nodes by id, or by what is still missing.",
  "Each item comes back with the code it covers, what the change did to those lines, its ancestors, and `needs`, which says what to write.",
  "Work `unfilled` until `total` is zero. There is no page cursor, because the list shrinks as you fill it.",
].join(" ")

export const registerNodesTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "nodes",
    { description: DESCRIPTION, inputSchema: readNodesInputShape },
    async (input) => {
      const reading = await readNodes(input, context)
      if (reading.kind === "rejected") return errorResult(reading.message)
      return reading.kind === "selected"
        ? jsonResult({ items: reading.items })
        : jsonResult({ items: reading.items, total: reading.total, remaining: reading.remaining, unwritten: reading.unwritten })
    },
  )
}
