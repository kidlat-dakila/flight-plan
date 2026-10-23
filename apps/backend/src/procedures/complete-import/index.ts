import type { ProcedureContext } from "@/procedures/context"
import { markAgentSeen } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { parseStoredReview, savedVersionOf } from "@/procedures/get-review/utils/stored-review"
import { ARTIFACT_MIGRATIONS } from "@/procedures/migrate-review/utils/artifact-migrations"
import { reviewVersionStateOf } from "@/procedures/migrate-review/utils/review-version"
import type { CompleteImportInput, ImportCompletion } from "./utils/schemas"

const NOT_REQUESTED_MESSAGE = "The reviewer asked for no import of this review target, so nothing was stored."
const UNREADABLE_MESSAGE = "is not a Flight Plan file, so nothing was stored. Copy the file the Artifact tool saved, unchanged."
const IMPORTED_NOTE = "Imported. The reviewer can open the Flight Plan now."

const rejected = (message: string): ImportCompletion => ({ kind: "rejected", message })

const isFromAnotherVersion = (text: string, runningVersion: string | null): boolean =>
  reviewVersionStateOf(savedVersionOf(text), runningVersion, ARTIFACT_MIGRATIONS).kind !== "current"

const storeImported = async (key: ReviewKey, text: string, context: ProcedureContext): Promise<boolean> => {
  const scaffold = parseStoredReview(text)
  if (scaffold !== null) {
    await context.reviewStore.writeScaffold(key, scaffold)
    return true
  }
  if (!isFromAnotherVersion(text, context.runningVersion)) return false
  await context.reviewStore.writeStoredText(key, text)
  return true
}

export const completeImport = async (input: CompleteImportInput, context: ProcedureContext): Promise<ImportCompletion> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const request = await context.reviewStore.readImportRequest(key)
  if (request?.importedAt !== null) return rejected(NOT_REQUESTED_MESSAGE)
  markAgentSeen(key, context)
  const path = context.importFiles.pathOf(key)
  const text = await context.importFiles.read(key)
  if (text === null) return rejected(`There is no file at ${path} yet. Copy the Flight Plan there, then call record-import again.`)
  if (!(await storeImported(key, text, context))) return rejected(`The file at ${path} ${UNREADABLE_MESSAGE}`)
  await Promise.all([
    context.reviewStore.writeImportRequest(key, { ...request, importedAt: context.now() }),
    context.importFiles.remove(key),
  ])
  return { kind: "imported", note: IMPORTED_NOTE }
}
