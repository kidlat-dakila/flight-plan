import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { updateNodes } from "@/procedures/update-nodes"
import { updateNodesInputShape } from "@/procedures/update-nodes/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Writes prose onto what one segment of the artifact already has, by id, in one batch.",
  "`segmentId` names that segment, and every id in the call is looked up inside it.",
  "The segment's own fields are written by name: `title`, `context` and `order` for the order of the File Sections.",
  "Three lists write what is inside it, and each names where its work goes: `waypoints` for the Code Walkthrough, `traceDiagram` for the Trace Diagram, `blastDiagram` for what the change does to the files it did not touch.",
  "On the Trace Diagram a component is a frame of one card for its page, a user action is a row inside its component, and every edge is one plain line with no label, so the words on a node carry what the reviewer reads.",
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
