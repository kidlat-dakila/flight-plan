import { createFileRoute } from "@tanstack/react-router"
import ReviewPageSkeleton from "./-components/ReviewPageSkeleton"
import { ReviewError, ReviewPage, reviewRequestOf, validateReviewSearch } from "./-review-page"

const ReviewRoutePage = () => {
  const navigate = Route.useNavigate()
  return (
    <ReviewPage
      params={Route.useParams()}
      search={Route.useSearch()}
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
    const page = await queryClient.query({ ...trpc.review.get.queryOptions(reviewRequestOf(params, deps)), staleTime: "static" })
    if (page.kind !== "missing" || !page.isOwn) return
    await queryClient.query({
      ...trpc.review.creationForm.queryOptions({ repositoryName: params.repoName, targetId: params.branchId }),
      staleTime: "static",
    })
  },
  component: ReviewRoutePage,
  pendingComponent: ReviewPageSkeleton,
  errorComponent: ReviewError,
})
