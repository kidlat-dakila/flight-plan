import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useDeferredValue, useState } from "react"
import type { CreationForm, TargetSearch } from "@/routes/pr-reviews/$repoName/-components/CreateFlightPlanForm"
import { useTRPC } from "@/trpc"

const SEARCHING_MESSAGE = "Searching…"
const NO_QUERY = ""

export interface FlightPlanCreation {
  readonly creationForm: CreationForm
  readonly targetSearch: TargetSearch
  readonly onTargetQueryChange: (query: string) => void
  readonly onTargetSelect: (targetId: string) => void
}

export const useFlightPlanCreation = (repositoryName: string): FlightPlanCreation => {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const [query, setQuery] = useState(NO_QUERY)
  const deferredQuery = useDeferredValue(query)
  const { data: creationForm } = useSuspenseQuery(trpc.review.creationForm.queryOptions({ repositoryName }))
  const targets = useQuery({
    ...trpc.review.searchTargets.queryOptions({ repositoryName, query: deferredQuery }),
    placeholderData: keepPreviousData,
  })

  return {
    creationForm,
    targetSearch: {
      value: query,
      options: targets.data?.options ?? [],
      message: targets.data?.message ?? (targets.isPending ? SEARCHING_MESSAGE : null),
    },
    onTargetQueryChange: setQuery,
    onTargetSelect: (targetId) => {
      void navigate({ to: "/pr-reviews/$repoName/$branchId", params: { repoName: repositoryName, branchId: targetId } })
    },
  }
}
