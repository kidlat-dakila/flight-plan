import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "@/trpc"
import type { LaunchAgentDialogContent } from "@flightplan/ui/LaunchAgentDialog"
import type { AgentStatus } from "@flightplan/ui/ReviewHeader"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface LiveAgentAnnouncer {
  readonly onMessage: (message: string) => void
}

type Opening = "unchecked" | "open" | "closed"

export interface LiveAgentState {
  readonly status: AgentStatus | null
  readonly dialog: LaunchAgentDialogContent | null
  readonly isOpening: boolean
  readonly problem: string | null
  readonly onAgentAction: () => void
  readonly onOpenTerminal: () => void
  readonly onClose: () => void
}

const PRESENCE_INTERVAL_MS = 5000

export const useLiveAgent = (reviewKey: ReviewKey, hasArtifact: boolean, announcer: LiveAgentAnnouncer): LiveAgentState => {
  const trpc = useTRPC()
  const [opening, setOpening] = useState<Opening>("unchecked")
  const [lastIdleStop, setLastIdleStop] = useState<string | null | undefined>(undefined)
  const { data } = useQuery({
    ...trpc.review.liveAgent.queryOptions(reviewKey),
    refetchInterval: PRESENCE_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })
  const writeUpPlan = useQuery({ ...trpc.review.writeUpPlan.queryOptions({ ...reviewKey, sections: null }), enabled: hasArtifact })
  const isOfferedOnOpen = writeUpPlan.data?.kind === "plan" ? writeUpPlan.data.isOffered : null
  const live = data?.kind === "live" ? data : null
  const isOffline = live !== null && !live.isOnline
  if (opening === "unchecked" && live !== null && isOfferedOnOpen !== null) {
    setOpening(isOfferedOnOpen && isOffline ? "open" : "closed")
  }
  const idleStop = live?.idleStoppedAt ?? null
  if (live !== null && lastIdleStop === undefined) setLastIdleStop(idleStop)
  if (lastIdleStop !== undefined && idleStop !== null && idleStop !== lastIdleStop) {
    setLastIdleStop(idleStop)
    setOpening("open")
  }

  const terminal = useMutation(
    trpc.review.openAgentTerminal.mutationOptions({
      onSuccess: (result) => {
        if (result.kind !== "opened") return
        setOpening("closed")
        announcer.onMessage(result.message)
      },
      onError: (error) => { announcer.onMessage(error.message) },
    }),
  )
  const open = (): void => {
    terminal.reset()
    setOpening("open")
  }

  return {
    status: live === null ? null : { isOnline: live.isOnline, label: live.statusLabel, onClick: live.isOnline ? null : open },
    dialog: opening === "open" && isOffline ? live.dialog : null,
    isOpening: terminal.isPending,
    problem: terminal.data?.kind === "rejected" ? terminal.data.message : null,
    onAgentAction: () => {
      if (isOffline) open()
    },
    onOpenTerminal: () => {
      terminal.mutate(reviewKey)
    },
    onClose: () => {
      setOpening("closed")
    },
  }
}
