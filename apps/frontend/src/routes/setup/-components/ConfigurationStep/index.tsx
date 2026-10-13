import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import DefaultConfigurationForm from "@flightplan/ui/DefaultConfigurationForm"

type DefaultConfigurationFormProps = React.ComponentProps<typeof DefaultConfigurationForm>

interface ConfigurationStepProps extends Omit<DefaultConfigurationFormProps, "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Choose a default configuration"

const ConfigurationStep = ({ backStep, problem, isPending, ...form }: ConfigurationStepProps) => (
  <>
    <StepIntro title={TITLE}>
      A configuration decides how the agent writes a review: the voice of its prose, how each part is worded, and
      which sections it generates. The structure of a review stays the same.
    </StepIntro>
    <DefaultConfigurationForm {...form}>
      <ul className="max-w-[62ch] list-disc pt-4 pl-5 text-sm text-muted-foreground">
        <li>You can pick another configuration each time you create a Flight Plan.</li>
        <li>You can create your own configurations later, in the settings.</li>
      </ul>
      <StepActions
        backStep={backStep}
        submitLabel="Save and continue"
        pendingLabel="Saving…"
        isPending={isPending}
        errorMessage={problem?.message ?? null}
      />
    </DefaultConfigurationForm>
  </>
)

export default ConfigurationStep
