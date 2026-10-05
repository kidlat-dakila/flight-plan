import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { updateDocument } from "@/procedures/update-document"
import { updateDocumentInputShape } from "@/procedures/update-document/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Writes the parts of a review artifact that are not waypoints or nodes: the context, the overview, the implementation list, the line that frames the Code Walkthrough, and the order of the File Sections.",
  "Every field is optional and only what is given is written.",
  "A refused call writes nothing and says why.",
].join(" ")

export const registerUpdateDocumentTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "update-document",
    { description: DESCRIPTION, inputSchema: updateDocumentInputShape },
    async (input) => {
      const writing = await updateDocument(input, context)
      return writing.kind === "written"
        ? jsonResult({ note: writing.note, unwritten: writing.unwritten })
        : errorResult(writing.message)
    },
  )
}
