import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useDeferredValue, useState } from "react"
import { requestNotificationPermission } from "@/notification-permission"
import type { CreationForm, TargetSearch } from "@/routes/pr-reviews/$repoName/-components/CreateFlightPlanForm"
import { useTRPC } from "@/trpc"
import type { RequestProblem, ReviewChoice } from "@flightplan/ui/StartReviewForm"

const SEARCHING_MESSAGE = "Searching…"
const NO_QUERY = ""
const NO_TARGET_ID = ""
const AUTHOR_WRITER = "author"

export interface FlightPlanCreation {
  readonly creationForm: CreationForm
  readonly targetSearch: TargetSearch
  readonly problem: RequestProblem | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onTargetQueryChange: (query: string) => void
  readonly onTargetSelect: (targetId: string) => void
  readonly onSubmit: (choice: ReviewChoice) => void
}

export const useFlightPlanCreation = (repositoryName: string, targetId: string | null): FlightPlanCreation => {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [typedQuery, setTypedQuery] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(typedQuery ?? NO_QUERY)
  const { data: creationForm } = useSuspenseQuery(trpc.review.creationForm.queryOptions({ repositoryName, targetId }))
  const targets = useQuery({
    ...trpc.review.searchTargets.queryOptions({ repositoryName, query: deferredQuery }),
    placeholderData: keepPreviousData,
  })
  const chosenTarget = typedQuery === null ? creationForm.target.selected : null
  const requestReview = useMutation(
    trpc.review.request.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind !== "requested") return
        if (result.prompt !== null) await navigator.clipboard.writeText(result.prompt).catch(() => undefined)
        await queryClient.invalidateQueries(trpc.review.get.pathFilter())
      },
    }),
  )

  return {
    creationForm,
    targetSearch: {
      value: typedQuery ?? chosenTarget?.label ?? NO_QUERY,
      options: targets.data?.options ?? [],
      message: targets.data?.message ?? (targets.isPending ? SEARCHING_MESSAGE : null),
    },
    problem: requestReview.data?.kind === "rejected" ? requestReview.data : null,
    errorMessage: requestReview.data?.kind === "unavailable" ? requestReview.data.message : requestReview.error?.message ?? null,
    isPending: requestReview.isPending,
    onTargetQueryChange: setTypedQuery,
    onTargetSelect: (selectedTargetId) => {
      requestReview.reset()
      setTypedQuery(null)
      void navigate({
        to: "/pr-reviews/$repoName/$branchId/create",
        params: { repoName: repositoryName, branchId: selectedTargetId },
      })
    },
    onSubmit: (choice) => {
      if (choice.writer.kind !== AUTHOR_WRITER) requestNotificationPermission()
      requestReview.mutate({ repositoryName, targetId: chosenTarget?.id ?? NO_TARGET_ID, ...choice })
    },
  }
}
