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
      Flight Plan builds almost everything on its own. It draws the Trace Diagram and the Blast Diagram, and arranges
      the Code Walkthrough the way you prefer. What it can&apos;t do is explain how the code works or find potential issues.
      That&apos;s where your agent comes in, to make the change easier to understand.
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
