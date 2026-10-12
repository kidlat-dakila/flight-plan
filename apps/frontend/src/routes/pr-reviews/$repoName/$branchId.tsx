import { createFileRoute } from "@tanstack/react-router"
import ReviewPageSkeleton from "./-components/ReviewPageSkeleton"
import { ReviewError, ReviewPage, reviewRequestOf, validateReviewSearch } from "./-review-page"

const ReviewRoutePage = () => {
  const navigate = Route.useNavigate()
  return (
    <ReviewPage
      params={Route.useParams()}
      search={Route.useSearch()}
      authoring={null}
      onSearchChange={(change) => {
        void navigate({ search: (previous) => ({ ...previous, ...change }), replace: true, resetScroll: false })
      }}
    />
  )
}

export const Route = createFileRoute("/pr-reviews/$repoName/$branchId")({
  staticData: { isFullWidth: true },
  validateSearch: validateReviewSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, trpc }, params, deps }) => {
    await queryClient.query({ ...trpc.review.get.queryOptions(reviewRequestOf(params, deps)), staleTime: "static" })
  },
  component: ReviewRoutePage,
  pendingComponent: ReviewPageSkeleton,
  errorComponent: ReviewError,
})
