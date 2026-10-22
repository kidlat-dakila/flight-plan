import type { Publication, PublishingRequest } from "@/procedures/get-review/utils/discussion"

export const LISTENER_PUBLISHING_WAIT_MS = 600_000

const wasRecordedSince = (request: PublishingRequest, publications: readonly Publication[]): boolean =>
  publications.some((publication) => publication.kind === "claude" && publication.publishedAt.getTime() >= request.requestedAt.getTime())

export const isPublishingUnderway = (
  request: PublishingRequest | null,
  publications: readonly Publication[],
  isAgentOnline: boolean,
  now: Date,
): boolean => {
  if (request === null || wasRecordedSince(request, publications)) return false
  return request.channel === "agent"
    ? isAgentOnline
    : now.getTime() - request.requestedAt.getTime() < LISTENER_PUBLISHING_WAIT_MS
}
