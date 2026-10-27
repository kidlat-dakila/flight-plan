import type { ProcedureContext } from "@/procedures/context"
import { formatTextReference } from "./utils/format-text-reference"
import { locatePart } from "./utils/locate-part"
import type { BuildTextReferenceInput, TextReference } from "./utils/schemas"

export const buildTextReference = async (
  input: BuildTextReferenceInput,
  context: ProcedureContext,
): Promise<TextReference | null> => {
  const artifact = await context.reviewStore.findArtifact({
    repositoryName: input.repositoryName,
    targetId: input.targetId,
  })
  if (artifact === null) return null
  return { reference: formatTextReference(locatePart(artifact, input.part), input.quote) }
}
