import type { ProcedureContext } from "@/procedures/context"
import { missingArtifactRejection, openArtifact } from "@/procedures/read-artifact/utils/open-artifact"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import type { ArtifactCompletion, CompleteArtifactInput } from "./utils/schemas"

const DEFAULT_MISSING_LIMIT = 20
const COMPLETE_STATUS = "complete"

export const completeArtifact = async (input: CompleteArtifactInput, context: ProcedureContext): Promise<ArtifactCompletion> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const opened = await openArtifact(key, context)
  if (opened.kind === "rejected") return opened
  const completion = await context.reviewStore.amendArtifact<ArtifactCompletion>(key, (artifact) => {
    const work = unwrittenWork(artifact, opened.sections)
    const missing = work.slice(0, input.limit ?? DEFAULT_MISSING_LIMIT)
    if (work.length > 0) {
      return { artifact: null, outcome: { kind: "unfinished", missing, total: work.length, remaining: work.length - missing.length } }
    }
    return {
      artifact: artifact.status === COMPLETE_STATUS ? null : { ...artifact, status: COMPLETE_STATUS },
      outcome: { kind: "finished" },
    }
  })
  return completion ?? missingArtifactRejection(key)
}
