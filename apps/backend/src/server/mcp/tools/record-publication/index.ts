import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { recordPublication } from "@/procedures/record-publication"
import { recordPublicationInputShape } from "@/procedures/record-publication/utils/schemas"
import { recordingFailures } from "@/server/mcp/tool-failures"
import { errorResult, textResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Records the address of the Claude artifact a Flight Plan was published to.",
  "Call it once, right after the Artifact tool publishes the page Flight Plan asked you to publish.",
  "Until it is called, the reviewer has no link to the artifact.",
].join(" ")

export const registerRecordPublicationTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "record-publication",
    { description: DESCRIPTION, inputSchema: recordPublicationInputShape },
    recordingFailures(context.errorLog, "record-publication", async (input) => {
      const recording = await recordPublication(input, context)
      return recording.kind === "recorded" ? textResult(recording.note) : errorResult(recording.message)
    }),
  )
}
