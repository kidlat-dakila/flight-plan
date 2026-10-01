import type { ProcedureContext } from "@/procedures/context"
import { planPublication, PUBLISHED_MESSAGES } from "./utils/plan-publication"
import type { PublishArtifactInput } from "./utils/schemas"

export const publishArtifact = async (
  input: PublishArtifactInput,
  context: ProcedureContext,
): Promise<{ readonly message: string } | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, detail, publications] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readPublications(key),
  ])
  const planned = artifact === null
    ? null
    : planPublication(publications, input.destination, { ...key, forgeUrl: detail?.forgeUrl ?? null }, context.now())
  if (planned === null) return null
  await context.reviewStore.writePublications(key, planned)
  return { message: PUBLISHED_MESSAGES[input.destination] }
}
