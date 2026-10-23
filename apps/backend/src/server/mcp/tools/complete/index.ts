import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { completeArtifact } from "@/procedures/complete-artifact"
import { completeArtifactInputShape } from "@/procedures/complete-artifact/utils/schemas"
import type { ProcedureContext } from "@/procedures/context"
import { recordingFailures } from "@/server/mcp/tool-failures"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "Says the review artifact is finished, and checks it in full.",
  "Must be called: until it is, the reviewer sees the artifact marked as still being written.",
  "When something is missing it changes nothing and returns the list, the same one `nodes` hands out.",
].join(" ")

const NEXT_STEP = "Write these with update-nodes, then call complete again."

export const registerCompleteTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "complete",
    { description: DESCRIPTION, inputSchema: completeArtifactInputShape },
    recordingFailures(context.errorLog, "complete", async (input) => {
      const completion = await completeArtifact(input, context)
      if (completion.kind === "rejected") return errorResult(completion.message)
      return completion.kind === "finished"
        ? jsonResult({ finished: true })
        : jsonResult({
            finished: false,
            missing: completion.missing,
            total: completion.total,
            remaining: completion.remaining,
            next: NEXT_STEP,
          })
    }),
  )
}
