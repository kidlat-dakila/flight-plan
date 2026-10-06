import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { updateNodes } from "@/procedures/update-nodes"
import { updateNodesInputShape } from "@/procedures/update-nodes/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Writes prose onto what one segment of the artifact already has, by id, in one batch.",
  "`segmentId` names that segment, and every id in the call is looked up inside it.",
  "The segment's own fields are written by name: `title`, `context`, `intro` for the line that frames the Code Walkthrough, and `order` for the order of the File Sections.",
  "Four lists write what is inside it, and each names where its work goes: `waypoints` for the Code Walkthrough, `files` for File Section titles and summaries, `journey` for the Journey Flow Diagram, `blast` for the Blast Diagram.",
  "The result counts the nodes that are complete and the ones that are not, and what is still unwritten by kind.",
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
        ? jsonResult({ note: writing.note, nodes: writing.nodes, unwritten: writing.unwritten })
        : errorResult(writing.message)
    },
  )
}
