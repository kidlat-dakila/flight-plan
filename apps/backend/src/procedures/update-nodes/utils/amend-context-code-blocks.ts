import { NO_CONTEXT_REQUIRED_MESSAGE, requiresContextCodeBlocks } from "@/procedures/read-artifact/utils/context-code-blocks"
import type { ReviewArtifact } from "@flightplan/configurations"
import { refuse, type ArtifactAmended, type Refusal } from "./refusal"
import type { ContextCodeBlockEdit } from "./schemas"

const quoted = (ids: readonly string[]): string => [...new Set(ids)].map((id) => `\`${id}\``).join(", ")

const idProblemOf = (artifact: ReviewArtifact, edits: readonly ContextCodeBlockEdit[]): string | null => {
  const wantedIds = edits.map((edit) => edit.id)
  const repeatedIds = wantedIds.filter((id, index) => wantedIds.indexOf(id) !== index)
  if (repeatedIds.length > 0) return `This call names the context code block ${quoted(repeatedIds)} more than once.`
  const unknownIds = wantedIds.filter((id) => artifact.contextCodeBlocks.every((listed) => listed.codeBlock.id !== id))
  if (unknownIds.length > 0) return `This artifact has no context code block ${quoted(unknownIds)}. Call nodes with \`needs: ["context-description"]\` for the ones it has.`
  const unrequiredIds = wantedIds.filter((id) => artifact.contextCodeBlocks.some((listed) => listed.codeBlock.id === id && !listed.isRequired))
  return unrequiredIds.length > 0
    ? `The configuration of this review asks for no description of ${quoted(unrequiredIds)}. Leave it as it is.`
    : null
}

export const contextCodeBlockTextsOf = (edits: readonly ContextCodeBlockEdit[]): string[] => edits.map((edit) => edit.description)

export const amendContextCodeBlocks = (artifact: ReviewArtifact, edits: readonly ContextCodeBlockEdit[]): ArtifactAmended | Refusal => {
  if (edits.length === 0) return { kind: "amended", artifact }
  if (!requiresContextCodeBlocks(artifact)) return refuse(NO_CONTEXT_REQUIRED_MESSAGE)
  const idProblem = idProblemOf(artifact, edits)
  if (idProblem !== null) return refuse(idProblem)
  const descriptionById = new Map(edits.map((edit) => [edit.id, edit.description]))
  return {
    kind: "amended",
    artifact: {
      ...artifact,
      contextCodeBlocks: artifact.contextCodeBlocks.map((listed) => ({
        ...listed,
        description: descriptionById.get(listed.codeBlock.id) ?? listed.description,
      })),
    },
  }
}
