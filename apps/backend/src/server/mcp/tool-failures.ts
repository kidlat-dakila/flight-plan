import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import type { ErrorLog } from "@/procedures/record-error/utils/error-log"

export const toolSourceOf = (toolName: string): string => `MCP tool ${toolName}`

const textOf = (result: CallToolResult): string =>
  result.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n")

export const recordingFailures = <Input>(
  errorLog: ErrorLog,
  toolName: string,
  handle: (input: Input) => Promise<CallToolResult>,
) => async (input: Input): Promise<CallToolResult> => {
  const result = await handle(input).catch((failure: unknown) => {
    errorLog.recordFailure(toolSourceOf(toolName), failure)
    throw failure
  })
  if (result.isError === true) errorLog.record({ source: toolSourceOf(toolName), message: textOf(result), stack: null })
  return result
}
