import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import ForgesForm from "@flightplan/ui/ForgesForm"

type ForgesFormProps = React.ComponentProps<typeof ForgesForm>

interface ForgesStepProps extends Omit<ForgesFormProps, "problem" | "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Git integration"

const ForgesStep = ({ backStep, problem, isPending, ...form }: ForgesStepProps) => (
  <>
    <StepIntro title={TITLE}>
      Flight Plan works with the git repositories on this computer. It reads branches and commits, fetches from your
      remotes in the background, and fast-forwards a branch when you update a review. It never commits, pushes or
      rewrites your history. Local git is always on, so every repository works without an account.
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
