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
      Your pull requests live on a code hosting site such as GitHub, GitLab or Bitbucket. Connect Flight Plan to each
      one you use, through its command line tool or with a token, and pick which one to use by default. Local git
      needs no account: it reviews the branches on this computer, with fewer features.
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
