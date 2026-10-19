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
      Flight Plan builds every review on its own, without a model: it splits the change into segments, draws the
      Trace Diagram and the Blast Diagram, and lays out the files and lines of the Code Walkthrough. What it can&apos;t
      do is explain the change: say what each part does and why, and spot the bugs it might hide. Your agent writes
      that part. Pick the agents you use, and where Flight Plan installs its plugin for each one.
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
