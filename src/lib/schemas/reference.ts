/**
 * How a copied reference names what it points at: `[mcp:<tool>] <target>`,
 * or the bare target when there is no tool to suggest.
 *
 * One rule for the extension's title-bar buttons and the renderer's selection
 * references, so an assistant reads the same shape from both.
 */
export function mcpReference(target: string, toolHint: string): string {
  const hint = toolHint.trim()
  return hint === "" ? target : `[mcp:${hint}] ${target}`
}
