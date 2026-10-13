import type { ProcedureContext } from "@/procedures/context"
import { planBlastEdit } from "./utils/plan-blast-edit"
import type { BlastEditing, EditBlastInput } from "./utils/schemas"

export const editBlast = async (input: EditBlastInput, context: ProcedureContext): Promise<BlastEditing | null> =>
  await context.reviewStore.amendArtifact<BlastEditing>(
    { repositoryName: input.repositoryName, targetId: input.targetId },
    (artifact) => {
      const planned = planBlastEdit(artifact, input)
      return planned.kind === "rejected"
        ? { artifact: null, outcome: planned }
        : { artifact: planned.artifact, outcome: { kind: "saved" } }
    },
  )
