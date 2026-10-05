import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { sendAgentMessage } from "@/procedures/send-agent-message"
import { sendAgentMessageInputShape } from "@/procedures/send-agent-message/utils/schemas"

const DESCRIPTION
  = "Send the reviewer a message in Flight Plan's web app. Use it for every answer, summary or result the reviewer should read."

export const registerSendMessageTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "send-message",
    { description: DESCRIPTION, inputSchema: sendAgentMessageInputShape },
    async (input) => {
      const sending = await sendAgentMessage(input, context)
      return sending.kind === "sent"
        ? { content: [{ type: "text", text: sending.note }] }
        : { content: [{ type: "text", text: sending.message }], isError: true }
    },
  )
}
