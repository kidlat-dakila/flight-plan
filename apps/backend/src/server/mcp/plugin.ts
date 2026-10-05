import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { MCP_INSTRUCTIONS } from "@/procedures/get-conversation/utils/agent-text"
import { registerAskQuestionsTool } from "./tools/ask-questions"
import { registerCompleteTool } from "./tools/complete"
import { registerGetInstructionsTool } from "./tools/get-instructions"
import { registerGreetTool } from "./tools/greet"
import { registerNodesTool } from "./tools/nodes"
import { registerReadTool } from "./tools/read"
import { registerSendMessageTool } from "./tools/send-message"
import { registerUpdateDocumentTool } from "./tools/update-document"
import { registerUpdateNodesTool } from "./tools/update-nodes"

export const MCP_PATH = "/mcp"

const HTTP_METHOD_NOT_ALLOWED = 405
const JSON_RPC_SERVER_ERROR = -32000

const methodNotAllowedBody = {
  jsonrpc: "2.0",
  error: { code: JSON_RPC_SERVER_ERROR, message: "Method not allowed." },
  id: null,
} as const

const createMcpServer = (context: ProcedureContext): McpServer => {
  const mcpServer = new McpServer({ name: "flight-plan", version: "0.1.0" }, { instructions: MCP_INSTRUCTIONS })
  registerGreetTool(mcpServer)
  registerSendMessageTool(mcpServer, context)
  registerAskQuestionsTool(mcpServer, context)
  registerGetInstructionsTool(mcpServer, context)
  registerReadTool(mcpServer, context)
  registerNodesTool(mcpServer, context)
  registerUpdateDocumentTool(mcpServer, context)
  registerUpdateNodesTool(mcpServer, context)
  registerCompleteTool(mcpServer, context)
  return mcpServer
}

const handleMcpRequest = (context: ProcedureContext) => async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const mcpServer = createMcpServer(context)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  reply.raw.on("close", () => {
    void transport.close()
    void mcpServer.close()
  })
  await mcpServer.connect(transport)
  reply.hijack()
  await transport.handleRequest(request.raw, reply.raw, request.body)
}

const rejectMcpMethod = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  await reply.code(HTTP_METHOD_NOT_ALLOWED).send(methodNotAllowedBody)
}

export const registerMcp = (server: FastifyInstance, context: ProcedureContext): void => {
  server.post(MCP_PATH, handleMcpRequest(context))
  server.get(MCP_PATH, rejectMcpMethod)
  server.delete(MCP_PATH, rejectMcpMethod)
}
