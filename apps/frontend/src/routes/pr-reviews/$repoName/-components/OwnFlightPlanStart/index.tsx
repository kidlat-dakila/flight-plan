import CreateFlightPlanForm from "@/routes/pr-reviews/$repoName/-components/CreateFlightPlanForm"
import { useFlightPlanCreation } from "@/routes/pr-reviews/$repoName/-hooks/use-flight-plan-creation"

interface OwnFlightPlanStartProps {
  readonly repositoryName: string
  readonly targetId: string
}

const OwnFlightPlanStart = ({ repositoryName, targetId }: OwnFlightPlanStartProps) => {
  const creation = useFlightPlanCreation(repositoryName, targetId)
  return (
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
  )
}

export default OwnFlightPlanStart
