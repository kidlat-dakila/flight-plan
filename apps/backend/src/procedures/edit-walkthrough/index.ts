import type { ProcedureContext } from "@/procedures/context"
import { planWalkthroughEdit } from "./utils/plan-walkthrough-edit"
import type { EditWalkthroughInput, WalkthroughEditing } from "./utils/schemas"

export const editWalkthrough = async (input: EditWalkthroughInput, context: ProcedureContext): Promise<WalkthroughEditing | null> =>
  await context.reviewStore.amendArtifact<WalkthroughEditing>(
    { repositoryName: input.repositoryName, targetId: input.targetId },
    (artifact) => {
      const planned = planWalkthroughEdit(artifact, input.segmentId, input.edit)
      return planned.kind === "rejected"
        ? { artifact: null, outcome: planned }
        : { artifact: planned.artifact, outcome: { kind: "saved" } }
    },
  )
