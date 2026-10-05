import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ProcedureContext } from "@/procedures/context"
import { getInstructions } from "@/procedures/get-instructions"
import { getInstructionsInputShape } from "@/procedures/get-instructions/utils/schemas"
import { errorResult, jsonResult } from "@/server/mcp/tool-result"

const DESCRIPTION = [
  "How to write a review artifact, for the configuration the reviewer chose when they started the review.",
  "With no `fields` it returns which sections are on and an index: every field you can ask about, each saying what it is.",
  "It returns no prose until you ask: call it again with `fields` when you reach the work a field is about.",
  "A section that is off is optional. Do not write it unless the reviewer asks.",
].join(" ")

export const registerGetInstructionsTool = (mcpServer: McpServer, context: ProcedureContext): void => {
  mcpServer.registerTool(
    "get-instructions",
    { description: DESCRIPTION, inputSchema: getInstructionsInputShape },
    async (input) => {
      const instructions = await getInstructions(input, context)
      if (instructions.kind === "rejected") return errorResult(instructions.message)
      return instructions.kind === "indexed"
        ? jsonResult(instructions.index)
        : jsonResult({ configuration: instructions.configuration, fields: instructions.fields })
    },
  )
}
