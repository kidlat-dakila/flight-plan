import { createFileRoute } from "@tanstack/react-router"
import CreateFlightPlanForm from "./-components/CreateFlightPlanForm"
import CreationError from "./-components/CreationError"
import { useFlightPlanCreation } from "./-hooks/use-flight-plan-creation"

const CreateFlightPlanPage = () => {
  const { repoName } = Route.useParams()
  const creation = useFlightPlanCreation(repoName, null)
  return (
    <>
      <header className="pb-6">
        <h1 className="text-4xl leading-10 font-bold tracking-[-0.02em]">{creation.creationForm.title}</h1>
        <p className="mt-2 max-w-[62ch] text-muted-foreground">{creation.creationForm.description}</p>
      </header>
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
    </>
  )
}

export const Route = createFileRoute("/pr-reviews/$repoName/create")({
  loader: async ({ context: { queryClient, trpc }, params }) => {
    await queryClient.query({
      ...trpc.review.creationForm.queryOptions({ repositoryName: params.repoName, targetId: null }),
      staleTime: "static",
    })
  },
  component: CreateFlightPlanPage,
  errorComponent: CreationError,
})
