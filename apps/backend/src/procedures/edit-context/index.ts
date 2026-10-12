import type { ProcedureContext } from "@/procedures/context"
import { planContextEdit } from "./utils/plan-context-edit"
import type { ContextEditing, EditContextInput } from "./utils/schemas"

export const editContext = async (input: EditContextInput, context: ProcedureContext): Promise<ContextEditing | null> =>
  await context.reviewStore.amendArtifact<ContextEditing>(
    { repositoryName: input.repositoryName, targetId: input.targetId },
    (artifact) => {
      const planned = planContextEdit(artifact, input)
      return planned.kind === "rejected"
        ? { artifact: null, outcome: planned }
        : { artifact: planned.artifact, outcome: { kind: "saved" } }
    },
  )
