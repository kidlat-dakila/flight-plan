import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { completeImport } from "@/procedures/complete-import"
import { completeImportInputShape } from "@/procedures/complete-import/utils/schemas"
import type { ProcedureContext } from "@/procedures/context"
import { errorResult, textResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Stores the Flight Plan you fetched from a Claude artifact as the Flight Plan of a review target.",
  "Call it once, after copying the fetched file to the path Flight Plan named when it asked for the import.",
  "It takes no path and no content: Flight Plan reads the file from that path.",
].join(" ")

export const registerRecordImportTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "record-import",
    { description: DESCRIPTION, inputSchema: completeImportInputShape },
    async (input) => {
      const completion = await completeImport(input, context)
      return completion.kind === "imported" ? textResult(completion.note) : errorResult(completion.message)
    },
  )
}
