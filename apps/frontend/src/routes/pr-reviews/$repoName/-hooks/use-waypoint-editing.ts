import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export interface WaypointText {
  readonly title: string
  readonly reading: string
  readonly coreChange: string | null
}

interface WaypointLocation {
  readonly segmentId: string
  readonly waypointId: string
}

interface WaypointEditing {
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onSave: (text: WaypointText) => void
}

export const useWaypointEditing = (reviewKey: ReviewKey, { segmentId, waypointId }: WaypointLocation, onSaved: () => void): WaypointEditing => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const editWalkthrough = useMutation(
    trpc.review.editWalkthrough.mutationOptions({
      onSuccess: async (editing) => {
        if (editing.kind !== "saved") return
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
        onSaved()
      },
    }),
  )
  const rejectionMessage = editWalkthrough.data?.kind === "rejected" ? editWalkthrough.data.message : null

  return {
    isSaving: editWalkthrough.isPending,
    errorMessage: rejectionMessage ?? editWalkthrough.error?.message ?? null,
    onSave: (text) => {
      editWalkthrough.mutate({ ...reviewKey, segmentId, edit: { kind: "change-waypoint", waypointId, ...text } })
    },
  }
}
