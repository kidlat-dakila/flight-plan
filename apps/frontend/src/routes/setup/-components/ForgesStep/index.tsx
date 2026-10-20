import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import ForgesForm from "@flightplan/ui/ForgesForm"

type ForgesFormProps = React.ComponentProps<typeof ForgesForm>

interface ForgesStepProps extends Omit<ForgesFormProps, "problem" | "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
  readonly onSkip: () => void
}

const TITLE = "Git integration"

const ForgesStep = ({ backStep, problem, isPending, onSkip, ...form }: ForgesStepProps) => (
  <>
    <StepIntro title={TITLE}>
      By default, Flight Plan uses the
      {" "}
      <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.875em]">git</code>
      {" "}
      command to read and fetch your local and remote branches and their commits.
    </StepIntro>
    <ForgesForm {...form} problem={problem}>
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem !== null && problem.field === null ? problem.message : null}
        onSkip={onSkip}
      />
    </ForgesForm>
  </>
)

export default ForgesStep
