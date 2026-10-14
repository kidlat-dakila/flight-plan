import type { ProcedureContext } from "@/procedures/context"
import { formatCodeReference } from "./utils/format-code-reference"
import type { BuildCodeReferenceInput, CodeReference } from "./utils/schemas"

export const buildCodeReference = async (
  input: BuildCodeReferenceInput,
  context: ProcedureContext,
): Promise<CodeReference | null> => {
  const artifact = await context.reviewStore.findArtifact({
    repositoryName: input.repositoryName,
    targetId: input.targetId,
  })
  const isCited = artifact?.sources.some((source) => source.path === input.path) ?? false
  if (artifact === null || !isCited) return null
  return { reference: formatCodeReference({ ...input, commit: artifact.commit }) }
}
