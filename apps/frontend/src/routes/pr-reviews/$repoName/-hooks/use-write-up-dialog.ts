import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { requestNotificationPermission } from "@/notification-permission"
import { useTRPC } from "@/trpc"
import type { WriteUpAgent } from "@flightplan/ui/lib/write-up-agent"
import type { WriteUpChoice, WriteUpPlan, WriteUpProblem, WriteUpSection } from "@flightplan/ui/WriteUpDialog"
import type { ToastContent } from "./use-toast"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface WriteUpAnnouncer {
  readonly onMessage: (content: ToastContent) => void
  readonly onCopy: (text: string, copiedMessage: string) => void
  readonly onAgentAsked: () => void
}

type Opening = "unasked" | "open" | "closed"

export interface WriteUpDialogState {
  readonly plan: WriteUpPlan | null
  readonly canWriteUp: boolean
  readonly agent: WriteUpAgent | null
  readonly problem: WriteUpProblem | null
  readonly isPending: boolean
  readonly onOpen: () => void
  readonly onSectionsChange: (sections: WriteUpSection[]) => void
  readonly onSubmit: (choice: WriteUpChoice) => void
  readonly onClose: () => void
}

const isShown = (opening: Opening, isOffered: boolean): boolean => opening === "open" || (opening === "unasked" && !isOffered)

export const useWriteUpDialog = (reviewKey: ReviewKey, hasArtifact: boolean, announcer: WriteUpAnnouncer): WriteUpDialogState => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [opening, setOpening] = useState<Opening>("unasked")
  const [sections, setSections] = useState<WriteUpSection[] | null>(null)
  const plan = useQuery({
    ...trpc.review.writeUpPlan.queryOptions({ ...reviewKey, sections }),
    enabled: hasArtifact,
    placeholderData: keepPreviousData,
  })
  const found = plan.data?.kind === "plan" ? plan.data : null

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.review.get.pathFilter()),
      queryClient.invalidateQueries(trpc.review.writeUpPlan.pathFilter()),
    ])
  }
  const close = (): void => {
    setOpening("closed")
    setSections(null)
  }

  const decline = useMutation(trpc.review.declineWriteUp.mutationOptions({ onSuccess: refresh }))
  const writeUp = useMutation(
    trpc.review.writeUp.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind === "rejected") return
        close()
        if (result.kind === "started" && result.prompt !== null) announcer.onCopy(result.prompt, result.message)
        else announcer.onMessage(result.message)
        if (result.kind === "started" && result.prompt === null) announcer.onAgentAsked()
        await refresh()
      },
      onError: (error) => { announcer.onMessage(error) },
    }),
  )

  return {
    plan: found !== null && isShown(opening, found.isOffered) ? found : null,
    canWriteUp: found !== null,
    agent: found === null ? null : { name: found.agent, label: found.agentLabel },
    problem: writeUp.data?.kind === "rejected" ? writeUp.data : null,
    isPending: writeUp.isPending,
    onOpen: () => {
      writeUp.reset()
      setOpening("open")
    },
    onSectionsChange: setSections,
    onSubmit: (choice) => {
      requestNotificationPermission()
      writeUp.mutate({ ...reviewKey, ...choice })
    },
    onClose: () => {
      if (found !== null && !found.isOffered) decline.mutate(reviewKey)
      close()
    },
  }
}
