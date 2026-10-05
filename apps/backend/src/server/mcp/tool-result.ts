import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

export const textResult = (text: string): CallToolResult => ({ content: [{ type: "text", text }] })

export const jsonResult = (content: unknown): CallToolResult => textResult(JSON.stringify(content))

export const errorResult = (message: string): CallToolResult => ({ ...textResult(message), isError: true })
