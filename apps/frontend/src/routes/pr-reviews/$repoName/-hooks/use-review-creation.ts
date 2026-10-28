import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { shownProblemOf, useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import { IDLE_BRANCH_SEARCH, type BranchSearch } from "@flightplan/ui/BaseBranchField"

const SEARCHING_MESSAGE = "Searching…"
const ALL_BRANCHES_QUERY = ""

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface CompareSearch {
  readonly compare?: string | undefined
}

export interface ReviewCreationState {
  readonly branchSearch: BranchSearch
  readonly isCreating: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly onBranchQueryChange: (query: string) => void
  readonly onBaseBranchChange: (branchName: string) => void
  readonly onCreate: () => void
}

export const useReviewCreation = (
  reviewKey: ReviewKey,
  baseBranch: string | null,
  onSearchChange: (change: CompareSearch) => void,
): ReviewCreationState => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const troubleshootFailure = useFailureTroubleshooting()
  const [query, setQuery] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)
  const suggestions = useQuery({
    ...trpc.review.searchBaseBranches.queryOptions({ repositoryName: reviewKey.repositoryName, query: deferredQuery ?? ALL_BRANCHES_QUERY }),
    enabled: deferredQuery !== null,
    placeholderData: keepPreviousData,
  })
  const createReview = useMutation(
    trpc.review.create.mutationOptions({
      onSuccess: async (creation) => {
        if (creation.kind === "unavailable") return
        await queryClient.invalidateQueries({ ...trpc.review.get.queryFilter(reviewKey), refetchType: "all" })
        onSearchChange({ compare: undefined })
      },
    }),
  )
  const rejection = createReview.data?.kind === "unavailable" ? createReview.data.message : null
  const problem = shownProblemOf(rejection, createReview.error)

  const branchSearch: BranchSearch = query === null
    ? IDLE_BRANCH_SEARCH
    : {
        query,
        options: suggestions.data?.options ?? [],
        message: suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null),
        errorMessage: suggestions.error?.message ?? null,
        onTroubleshoot: troubleshootFailure(suggestions.error),
      }

  return {
    branchSearch,
    isCreating: createReview.isPending,
    errorMessage: problem?.message ?? null,
    onTroubleshoot: troubleshootFailure(problem?.failure ?? null),
    onBranchQueryChange: setQuery,
    onBaseBranchChange: (branchName) => {
      setQuery(null)
      createReview.reset()
      onSearchChange({ compare: branchName })
    },
    onCreate: () => {
      if (baseBranch !== null) createReview.mutate({ ...reviewKey, baseBranch })
    },
  }
}
