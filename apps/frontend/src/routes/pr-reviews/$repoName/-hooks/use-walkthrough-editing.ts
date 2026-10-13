import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { MoveDirection } from "@/routes/pr-reviews/$repoName/-components/SegmentHeader"
import { useTRPC } from "@/trpc"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface WalkthroughEditing {
  readonly isPending: boolean
  readonly onMoveFile: (segmentId: string, path: string, direction: MoveDirection) => void
  readonly onRemoveFile: (segmentId: string, path: string) => void
  readonly onRemoveWaypoint: (segmentId: string, waypointId: string) => void
}

export const useWalkthroughEditing = (reviewKey: ReviewKey, onProblem: (message: string) => void): WalkthroughEditing => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const editWalkthrough = useMutation(
    trpc.review.editWalkthrough.mutationOptions({
      onSuccess: async (editing) => {
        if (editing.kind === "rejected") onProblem(editing.message)
        else await queryClient.invalidateQueries(trpc.review.get.pathFilter())
      },
      onError: (error) => { onProblem(error.message) },
    }),
  )

  return {
    isPending: editWalkthrough.isPending,
    onMoveFile: (segmentId, path, direction) => {
      editWalkthrough.mutate({ ...reviewKey, segmentId, edit: { kind: "move-file", path, direction } })
    },
    onRemoveFile: (segmentId, path) => {
      editWalkthrough.mutate({ ...reviewKey, segmentId, edit: { kind: "remove-file", path } })
    },
    onRemoveWaypoint: (segmentId, waypointId) => {
      editWalkthrough.mutate({ ...reviewKey, segmentId, edit: { kind: "remove-waypoint", waypointId } })
    },
  }
}
