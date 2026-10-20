import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc"
import type { WriteUpTarget as WaypointWriteUpTarget } from "@flightplan/ui/FileRows"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface WriteUpAnnouncer {
  readonly onMessage: (message: string) => void
  readonly onCopy: (text: string, copiedMessage: string) => void
}

export type WriteUpTarget
  = | WaypointWriteUpTarget
    | { readonly kind: "trace-node", readonly segmentId: string, readonly nodeId: string }
    | { readonly kind: "blast-file", readonly segmentId: string, readonly path: string }

export const useWriteUpRequest = (reviewKey: ReviewKey, announcer: WriteUpAnnouncer): ((target: WriteUpTarget) => void) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const request = useMutation(
    trpc.review.requestWriteUp.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind === "started" && result.prompt !== null) announcer.onCopy(result.prompt, result.message)
        else announcer.onMessage(result.message)
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
      },
      onError: (error) => { announcer.onMessage(error.message) },
    }),
  )
  return (target) => {
    request.mutate({ ...reviewKey, target })
  }
}
