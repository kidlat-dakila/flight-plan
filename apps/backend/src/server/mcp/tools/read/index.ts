import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { readArtifact } from "@/procedures/read-artifact"
import { readArtifactInputShape } from "@/procedures/read-artifact/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Returns one part of a review artifact. Every segment and every changed file comes back with its `segmentId`, which is what a write names.",
  "`overview` is the skeleton: ids, titles, the files a code link can name, and what is still unwritten, with no prose. Read it to get oriented.",
  "`diff` is the whole change, per file, with the waypoint ids that cover each one. Read the change here, not from git.",
  "`full` returns every word already written, and is for reading an artifact before changing one somebody has written.",
].join(" ")

export const registerReadTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "read",
    { description: DESCRIPTION, inputSchema: readArtifactInputShape },
    async (input) => {
      const reading = await readArtifact(input, context)
      return reading.kind === "read" ? jsonResult(reading.content) : errorResult(reading.message)
    },
  )
}
