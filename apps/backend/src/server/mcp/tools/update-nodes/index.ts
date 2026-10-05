import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { updateNodes } from "@/procedures/update-nodes"
import { updateNodesInputShape } from "@/procedures/update-nodes/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Writes prose onto what the artifact already has, by id, in one batch.",
  "Four lists, and each names where its work goes: `waypoints` for the Code Walkthrough, `files` for File Section titles and summaries, `journey` for the Journey Flow Diagram, `blast` for the Blast Diagram.",
  "It cannot add, remove or reparent anything.",
  "A batch is all or nothing: one bad entry writes none of it and names the entry.",
].join(" ")

export const registerUpdateNodesTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "update-nodes",
    { description: DESCRIPTION, inputSchema: updateNodesInputShape },
    async (input) => {
      const writing = await updateNodes(input, context)
      return writing.kind === "written"
        ? jsonResult({ note: writing.note, unwritten: writing.unwritten })
        : errorResult(writing.message)
    },
  )
}
