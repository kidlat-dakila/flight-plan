import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useDeferredValue, useState } from "react"
import { useTRPC } from "@/trpc"
import type { TargetSwitching } from "@flightplan/ui/TargetSwitcher"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

const LOADING_LABEL = "Loading the branches…"

export const useTargetSwitching = (reviewKey: ReviewKey): TargetSwitching => {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const [isOpened, setIsOpened] = useState(false)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const switcher = useQuery({
    ...trpc.review.targetSwitcher.queryOptions({ ...reviewKey, query: deferredQuery }),
    enabled: isOpened,
    placeholderData: keepPreviousData,
  })
  return {
    switcher: switcher.data ?? null,
    placeholder: switcher.error?.message ?? LOADING_LABEL,
    query,
    onOpen: () => {
      setIsOpened(true)
      void switcher.refetch()
    },
    onSearch: setQuery,
    onSwitch: (targetId) => {
      setQuery("")
      void navigate({ to: "/pr-reviews/$repoName/$branchId", params: { repoName: reviewKey.repositoryName, branchId: targetId } })
    },
  }
}
