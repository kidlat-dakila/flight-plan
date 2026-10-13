import { createFileRoute } from "@tanstack/react-router"
import CreateFlightPlanForm from "./-components/CreateFlightPlanForm"
import ReviewPageSkeleton from "./-components/ReviewPageSkeleton"
import { useFlightPlanCreation } from "./-hooks/use-flight-plan-creation"
import { ReviewError, ReviewPage, reviewRequestOf, validateReviewSearch } from "./-review-page"

const AUTHOR_LABEL = "Your Flight Plan"

const CreationRoutePage = () => {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const creation = useFlightPlanCreation(params.repoName, params.branchId)
  return (
    <ReviewPage
      params={params}
      search={Route.useSearch()}
      authoring={{
        label: AUTHOR_LABEL,
        startForm: (
          <div className="pt-8">
            <CreateFlightPlanForm
              creationForm={creation.creationForm}
              targetSearch={creation.targetSearch}
              problem={creation.problem}
              errorMessage={creation.errorMessage}
              isPending={creation.isPending}
              onTargetQueryChange={creation.onTargetQueryChange}
              onTargetSelect={creation.onTargetSelect}
              onSubmit={creation.onSubmit}
            />
          </div>
        ),
      }}
      onSearchChange={(change) => {
        void navigate({ search: (previous) => ({ ...previous, ...change }), replace: true, resetScroll: false })
      }}
    />
  )
}

export const Route = createFileRoute("/pr-reviews/$repoName/$branchId_/create")({
  staticData: { isFullWidth: true },
  validateSearch: validateReviewSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, trpc }, params, deps }) => {
    await Promise.all([
      queryClient.query({ ...trpc.review.get.queryOptions(reviewRequestOf(params, deps, true)), staleTime: "static" }),
      queryClient.query({
        ...trpc.review.creationForm.queryOptions({ repositoryName: params.repoName, targetId: params.branchId }),
        staleTime: "static",
      }),
    ])
  },
  component: CreationRoutePage,
  pendingComponent: ReviewPageSkeleton,
  errorComponent: ReviewError,
})
