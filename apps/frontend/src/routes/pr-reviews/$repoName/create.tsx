import { createFileRoute } from "@tanstack/react-router"
import CreateFlightPlanForm from "./-components/CreateFlightPlanForm"
import CreationError from "./-components/CreationError"
import { useFlightPlanCreation } from "./-hooks/use-flight-plan-creation"

const CreateFlightPlanPage = () => {
  const { repoName } = Route.useParams()
  const creation = useFlightPlanCreation(repoName)
  return (
    <>
      <header className="pb-6">
        <h1 className="text-4xl leading-10 font-bold tracking-[-0.02em]">{creation.creationForm.title}</h1>
        <p className="mt-2 max-w-[62ch] text-muted-foreground">{creation.creationForm.description}</p>
      </header>
      <CreateFlightPlanForm
        creationForm={creation.creationForm}
        targetSearch={creation.targetSearch}
        onTargetQueryChange={creation.onTargetQueryChange}
        onTargetSelect={creation.onTargetSelect}
      />
    </>
  )
}

export const Route = createFileRoute("/pr-reviews/$repoName/create")({
  loader: async ({ context: { queryClient, trpc }, params }) => {
    await queryClient.query({
      ...trpc.review.creationForm.queryOptions({ repositoryName: params.repoName }),
      staleTime: "static",
    })
  },
  component: CreateFlightPlanPage,
  errorComponent: CreationError,
})
