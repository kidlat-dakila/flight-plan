import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { ContextEditing } from "@/routes/pr-reviews/$repoName/-components/ContextBand"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export const useContextEditing = (reviewKey: ReviewKey): ((segmentId: string) => ContextEditing) => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const queryClient = useQueryClient()
  const [writingSegmentIds, setWritingSegmentIds] = useState<readonly string[]>([])
  const stopWriting = (segmentId: string): void => {
    setWritingSegmentIds((segmentIds) => segmentIds.filter((writingSegmentId) => writingSegmentId !== segmentId))
  }
  const editContext = useMutation(
    trpc.review.editContext.mutationOptions({
      onSuccess: async (editing, { segmentId }) => {
        if (editing.kind !== "saved") return
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
        stopWriting(segmentId)
      },
    }),
  )
  const rejectionMessage = editContext.data?.kind === "rejected" ? editContext.data.message : null
  const failureMessage = rejectionMessage ?? editContext.error?.message ?? null
  const failureTroubleshoot = rejectionMessage === null ? troubleshootFailure(editContext.error) : null

  return (segmentId) => {
    const isLastSaved = editContext.variables?.segmentId === segmentId
    return {
      isWriting: writingSegmentIds.includes(segmentId),
      isSaving: isLastSaved && editContext.isPending,
      errorMessage: isLastSaved ? failureMessage : null,
      onTroubleshoot: isLastSaved ? failureTroubleshoot : null,
      onEdit: () => {
        if (isLastSaved) editContext.reset()
        setWritingSegmentIds((segmentIds) => [...segmentIds, segmentId])
      },
      onSave: (markdown) => { editContext.mutate({ ...reviewKey, segmentId, context: markdown }) },
      onCancel: () => {
        if (isLastSaved) editContext.reset()
        stopWriting(segmentId)
      },
    }
  }
}
