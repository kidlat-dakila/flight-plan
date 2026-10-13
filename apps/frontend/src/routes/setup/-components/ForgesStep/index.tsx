import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import ForgesForm from "@flightplan/ui/ForgesForm"

type ForgesFormProps = React.ComponentProps<typeof ForgesForm>

interface ForgesStepProps extends Omit<ForgesFormProps, "problem" | "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Connect your git forge"

const ForgesStep = ({ backStep, problem, isPending, ...form }: ForgesStepProps) => (
  <>
    <StepIntro title={TITLE}>
      A forge hosts your pull requests. Pick every way Flight Plan may reach one, and choose the default. Local git
      works without a forge, with fewer features.
    </StepIntro>
    <ForgesForm {...form} problem={problem}>
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem !== null && problem.field === null ? problem.message : null}
      />
    </ForgesForm>
  </>
)

export default ForgesStep
