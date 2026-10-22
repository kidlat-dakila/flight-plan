import type { ProcedureContext } from "@/procedures/context"
import { markAgentSeen } from "@/procedures/get-conversation/utils/conversation-actions"
import { withPublication } from "@/procedures/publish-artifact/utils/plan-publication"
import { republishingNoteOf } from "@/procedures/publish-artifact/utils/publishing-request"
import { writePublishedCopy } from "@/procedures/write-published-copy"
import { isClaudeArtifactUrl } from "./utils/claude-artifact-url"
import type { PublicationRecording, RecordPublicationInput } from "./utils/schemas"

const NOT_AN_ARTIFACT_MESSAGE = "That is not the address of a Claude artifact. Pass the address the Artifact tool returned, such as https://claude.ai/artifact/<id>."
const NO_FLIGHT_PLAN_MESSAGE = "This review target has no Flight Plan, so nothing was recorded."
const RECORDED_NOTE = "Recorded. The reviewer now sees the link under Share."

export const recordPublication = async (input: RecordPublicationInput, context: ProcedureContext): Promise<PublicationRecording> => {
  if (!isClaudeArtifactUrl(input.url)) return { kind: "rejected", message: NOT_AN_ARTIFACT_MESSAGE }
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, publications] = await Promise.all([context.reviewStore.findArtifact(key), context.reviewStore.readPublications(key)])
  if (artifact === null) return { kind: "rejected", message: NO_FLIGHT_PLAN_MESSAGE }
  markAgentSeen(key, context)
  await context.reviewStore.writePublications(key, withPublication(publications, { kind: "claude", url: input.url, publishedAt: context.now() }))
  const isSameAddress = publications.some((publication) => publication.kind === "claude" && publication.url === input.url)
  if (isSameAddress) return { kind: "recorded", note: RECORDED_NOTE }
  const copy = await writePublishedCopy(key, context)
  return copy.kind === "written" && copy.hasImportLink
    ? { kind: "recorded", note: republishingNoteOf(copy.files, input.url) }
    : { kind: "recorded", note: RECORDED_NOTE }
}
