import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { askReviewer } from "@/procedures/ask-reviewer"
import { askReviewerInputShape } from "@/procedures/ask-reviewer/utils/schemas"
import type { ProcedureContext } from "@/procedures/context"

const DESCRIPTION = [
  "Ask the reviewer one question or a batch, answered together in Flight Plan's web app.",
  "Give a question options to pick from, or none for a free-text answer. The reviewer can always write their own answer.",
  "The result says how to receive the answers.",
].join(" ")

export const registerAskQuestionsTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "ask-questions",
    { description: DESCRIPTION, inputSchema: askReviewerInputShape },
    async (input) => {
      const asking = await askReviewer(input, context)
      return asking.kind === "asked"
        ? { content: [{ type: "text", text: asking.note }] }
        : { content: [{ type: "text", text: asking.message }], isError: true }
    },
  )
}
