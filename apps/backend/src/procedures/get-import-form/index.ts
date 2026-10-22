import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget, isAgentOnlineFor } from "@/procedures/get-conversation/utils/conversation-actions"
import { isImportUnderway } from "@/procedures/import-review/utils/import-request"
import { isClaudeArtifactUrl } from "@/procedures/record-publication/utils/claude-artifact-url"
import { buildImportForm } from "./utils/build-import-form"
import type { GetImportFormInput, ImportForm } from "./utils/schemas"

export const getImportForm = async (input: GetImportFormInput, context: ProcedureContext): Promise<ImportForm> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [target, artifact, request] = await Promise.all([
    findReviewTarget(key, context),
    context.reviewStore.findArtifact(key),
    context.reviewStore.readImportRequest(key),
  ])
  return buildImportForm({
    key,
    artifactUrl: input.artifactUrl,
    isArtifactUrl: isClaudeArtifactUrl(input.artifactUrl),
    target,
    hasFlightPlan: artifact !== null,
    request,
    isImporting: isImportUnderway(request, isAgentOnlineFor(key, context), context.now()),
  })
}
