import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import type { BlastAssessment } from "@flightplan/ui/BlastDiagram"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface BlastEditing {
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onSave: (assessment: BlastAssessment) => void
}

export const useBlastEditing = (reviewKey: ReviewKey, path: string, onSaved: () => void): BlastEditing => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const queryClient = useQueryClient()
  const editBlast = useMutation(
    trpc.review.editBlast.mutationOptions({
      onSuccess: async (editing) => {
        if (editing.kind !== "saved") return
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
        onSaved()
      },
    }),
  )
  const rejectionMessage = editBlast.data?.kind === "rejected" ? editBlast.data.message : null

  return {
    isSaving: editBlast.isPending,
    errorMessage: rejectionMessage ?? editBlast.error?.message ?? null,
    onTroubleshoot: rejectionMessage === null ? troubleshootFailure(editBlast.error) : null,
    onSave: (assessment) => { editBlast.mutate({ ...reviewKey, path, ...assessment }) },
  }
}
