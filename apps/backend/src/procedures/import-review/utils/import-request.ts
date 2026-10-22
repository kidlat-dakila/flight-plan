export interface ImportRequest {
  readonly artifactUrl: string
  readonly channel: "agent" | "listener"
  readonly requestedAt: Date
  readonly importedAt: Date | null
}

export const importIdOf = (request: ImportRequest): string => request.requestedAt.toISOString()

export const LISTENER_IMPORT_WAIT_MS = 600_000

export const isImportUnderway = (request: ImportRequest | null, isAgentOnline: boolean, now: Date): boolean => {
  if (request?.importedAt !== null) return false
  return request.channel === "agent" ? isAgentOnline : now.getTime() - request.requestedAt.getTime() < LISTENER_IMPORT_WAIT_MS
}
