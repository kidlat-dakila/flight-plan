import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import AgentInteraction from "@flightplan/ui/AgentInteraction"
import AgentsForm from "@flightplan/ui/AgentsForm"

type AgentsFormProps = React.ComponentProps<typeof AgentsForm>

interface AgentsStepProps extends Omit<AgentsFormProps, "problem" | "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Agent integration"

const AgentsStep = ({ backStep, problem, isPending, ...form }: AgentsStepProps) => (
  <>
    <StepIntro title={TITLE}>
      Configure which agent you prefer and where Flight Plan installs the agent plugin and the MCP server.
    </StepIntro>
    <AgentsForm {...form} problem={problem}>
      <AgentInteraction />
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem !== null && problem.field === null ? problem.message : null}
        onTroubleshoot={problem?.onTroubleshoot ?? null}
      />
    </AgentsForm>
  </>
)

export default AgentsStep
