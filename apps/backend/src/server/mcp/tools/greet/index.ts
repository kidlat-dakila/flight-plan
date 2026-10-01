import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { greet } from "@/procedures/greet"
import { greetInputShape } from "@/procedures/greet/utils/schemas"

export const registerGreetTool = (mcpServer: McpServer): void => {
  mcpServer.registerTool(
    "greet",
    { description: "Greet someone by name", inputSchema: greetInputShape },
    ({ name }) => ({ content: [{ type: "text", text: greet({ name }).message }] }),
  )
}
