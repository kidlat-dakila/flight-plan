import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
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
      A coding agent writes each review. Flight Plan installs its skills, its plugin and its MCP server into the
      folder of each agent you pick, and installs them again each time you save.
    </StepIntro>
    <AgentsForm {...form} problem={problem}>
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem !== null && problem.field === null ? problem.message : null}
      />
    </AgentsForm>
  </>
)

export default AgentsStep
