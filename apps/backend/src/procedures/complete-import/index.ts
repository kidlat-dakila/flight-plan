import type { ProcedureContext } from "@/procedures/context"
import { markAgentSeen } from "@/procedures/get-conversation/utils/conversation-actions"
import { parseStoredReview } from "@/procedures/get-review/utils/stored-review"
import type { CompleteImportInput, ImportCompletion } from "./utils/schemas"

const NOT_REQUESTED_MESSAGE = "The reviewer asked for no import of this review target, so nothing was stored."
const UNREADABLE_MESSAGE = "is not a Flight Plan file, so nothing was stored. Copy the file the Artifact tool saved, unchanged."
const IMPORTED_NOTE = "Imported. The reviewer can open the Flight Plan now."

const rejected = (message: string): ImportCompletion => ({ kind: "rejected", message })

export const completeImport = async (input: CompleteImportInput, context: ProcedureContext): Promise<ImportCompletion> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const request = await context.reviewStore.readImportRequest(key)
  if (request?.importedAt !== null) return rejected(NOT_REQUESTED_MESSAGE)
  markAgentSeen(key, context)
  const path = context.importFiles.pathOf(key)
  const text = await context.importFiles.read(key)
  if (text === null) return rejected(`There is no file at ${path} yet. Copy the Flight Plan there, then call record-import again.`)
  const scaffold = parseStoredReview(text)
  if (scaffold === null) return rejected(`The file at ${path} ${UNREADABLE_MESSAGE}`)
  await context.reviewStore.writeScaffold(key, scaffold)
  await Promise.all([
    context.reviewStore.writeImportRequest(key, { ...request, importedAt: context.now() }),
    context.importFiles.remove(key),
  ])
  return { kind: "imported", note: IMPORTED_NOTE }
}
