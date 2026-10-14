import type { ProcedureContext } from "@/procedures/context"
import { notGeneratedMessage, offSectionOfField } from "@/procedures/read-artifact/utils/artifact-sections"
import { isContextCodeBlockField, NO_CONTEXT_REQUIRED_MESSAGE } from "@/procedures/read-artifact/utils/context-code-blocks"
import { openArtifact } from "@/procedures/read-artifact/utils/open-artifact"
import { buildInstructionIndex, listFieldPaths, resolveFields, type FieldResolution } from "./utils/resolve-instructions"
import type { GetInstructionsInput, InstructionsResult } from "./utils/schemas"

const NO_NEAR_PATH_HINT = "Call get-instructions with no fields for the paths there are."

const quoted = (paths: readonly string[]): string => paths.map((path) => `\`${path}\``).join(", ")

const rejectionOf = (resolution: Exclude<FieldResolution, { kind: "resolved" }>): string =>
  resolution.kind === "unknown"
    ? `No field at ${quoted(resolution.paths)}. ${resolution.nearPaths.length > 0 ? `Did you mean ${quoted(resolution.nearPaths)}?` : NO_NEAR_PATH_HINT} Nothing was returned.`
    : `Flight Plan's instructions are incomplete: no text for ${quoted(resolution.keys)}. Tell the reviewer.`

export const getInstructions = async (input: GetInstructionsInput, context: ProcedureContext): Promise<InstructionsResult> => {
  const opened = await openArtifact({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (opened.kind === "rejected") return opened
  if (input.fields === undefined && input.all !== true) return { kind: "indexed", index: buildInstructionIndex(opened.configuration.id, opened) }
  const offSection = (input.fields ?? []).map((path) => offSectionOfField(path, opened.sections)).find((section) => section !== null)
  if (offSection != null) return { kind: "rejected", message: notGeneratedMessage(offSection) }
  if (!opened.requiresContextCodeBlocks && (input.fields ?? []).some(isContextCodeBlockField)) return { kind: "rejected", message: NO_CONTEXT_REQUIRED_MESSAGE }
  const resolution = resolveFields(input.fields ?? listFieldPaths(opened), await context.readInstructionTexts(), opened.configuration)
  return resolution.kind === "resolved"
    ? { kind: "resolved", configuration: opened.configuration.id, fields: resolution.fields }
    : { kind: "rejected", message: rejectionOf(resolution) }
}
