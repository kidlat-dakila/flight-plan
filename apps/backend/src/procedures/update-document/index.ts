import type { ProcedureContext } from "@/procedures/context"
import { openArtifact } from "@/procedures/read-artifact/utils/open-artifact"
import type { ArtifactWriting } from "@/procedures/update-nodes/utils/schemas"
import { writeAmendment } from "@/procedures/update-nodes/utils/write-amendment"
import { amendDocument } from "./utils/amend-document"
import type { UpdateDocumentInput } from "./utils/schemas"

const WRITTEN_NOTE = "Wrote the document."

export const updateDocument = async (input: UpdateDocumentInput, context: ProcedureContext): Promise<ArtifactWriting> => {
  const { repositoryName, targetId, ...edit } = input
  const key = { repositoryName, targetId }
  const opened = await openArtifact(key, context)
  if (opened.kind === "rejected") return opened
  return await writeAmendment(key, opened.sections, WRITTEN_NOTE, (artifact) => amendDocument(artifact, edit), context)
}
