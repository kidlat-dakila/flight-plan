import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { SegmentContent } from "@/routes/pr-reviews/$repoName/-components/SegmentEditor"
import type { MoveDirection, SegmentAuthoring, SegmentWriting } from "@/routes/pr-reviews/$repoName/-components/SegmentHeader"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import type { ToastContent } from "./use-toast"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

type SegmentEdit
  = | ({ readonly kind: "add" } & SegmentContent)
    | ({ readonly kind: "change", readonly segmentId: string } & SegmentContent)
    | { readonly kind: "move", readonly segmentId: string, readonly direction: MoveDirection }
    | { readonly kind: "remove", readonly segmentId: string }

export interface SegmentEditing {
  readonly isPending: boolean
  readonly onMove: (segmentId: string, direction: MoveDirection) => void
  readonly addition: SegmentWriting
  readonly authoringOf: (segmentId: string) => SegmentAuthoring
}

const isWrittenInForm = (edit: SegmentEdit): boolean => edit.kind === "add" || edit.kind === "change"

export const useSegmentEditing = (reviewKey: ReviewKey, onProblem: (content: ToastContent) => void): SegmentEditing => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const queryClient = useQueryClient()
  const [writingSegmentIds, setWritingSegmentIds] = useState<readonly string[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const stopWriting = (segmentId: string): void => {
    setWritingSegmentIds((segmentIds) => segmentIds.filter((writingSegmentId) => writingSegmentId !== segmentId))
  }
  const editSegments = useMutation(
    trpc.review.editSegments.mutationOptions({
      onSuccess: async (editing, { edit }) => {
        if (editing.kind === "rejected") {
          if (!isWrittenInForm(edit)) onProblem(editing.message)
          return
        }
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
        if (edit.kind === "add") setIsAdding(false)
        if (edit.kind === "change" || edit.kind === "remove") stopWriting(edit.segmentId)
      },
      onError: (error, { edit }) => {
        if (!isWrittenInForm(edit)) onProblem(error)
      },
    }),
  )
  const save = (edit: SegmentEdit): void => {
    editSegments.mutate({ ...reviewKey, edit: "paths" in edit ? { ...edit, paths: [...edit.paths] } : edit })
  }
  const lastEdit: SegmentEdit | null = editSegments.variables?.edit ?? null
  const rejectionMessage = editSegments.data?.kind === "rejected" ? editSegments.data.message : null
  const failureMessage = rejectionMessage ?? editSegments.error?.message ?? null
  const failureTroubleshoot = rejectionMessage === null ? troubleshootFailure(editSegments.error) : null
  const isLastAddition = lastEdit?.kind === "add"

  return {
    isPending: editSegments.isPending,
    onMove: (segmentId, direction) => { save({ kind: "move", segmentId, direction }) },
    addition: {
      isWriting: isAdding,
      isSaving: isLastAddition && editSegments.isPending,
      errorMessage: isLastAddition ? failureMessage : null,
      onTroubleshoot: isLastAddition ? failureTroubleshoot : null,
      onEdit: () => {
        if (isLastAddition) editSegments.reset()
        setIsAdding(true)
      },
      onSave: (content) => { save({ kind: "add", ...content }) },
      onCancel: () => {
        if (isLastAddition) editSegments.reset()
        setIsAdding(false)
      },
    },
    authoringOf: (segmentId) => {
      const isLastChange = lastEdit?.kind === "change" && lastEdit.segmentId === segmentId
      return {
        writing: {
          isWriting: writingSegmentIds.includes(segmentId),
          isSaving: isLastChange && editSegments.isPending,
          errorMessage: isLastChange ? failureMessage : null,
          onTroubleshoot: isLastChange ? failureTroubleshoot : null,
          onEdit: () => {
            if (isLastChange) editSegments.reset()
            setWritingSegmentIds((segmentIds) => (segmentIds.includes(segmentId) ? segmentIds : [...segmentIds, segmentId]))
          },
          onSave: (content) => { save({ kind: "change", segmentId, ...content }) },
          onCancel: () => {
            if (isLastChange) editSegments.reset()
            stopWriting(segmentId)
          },
        },
        isPending: editSegments.isPending,
        onRemove: () => { save({ kind: "remove", segmentId }) },
      }
    },
  }
}
