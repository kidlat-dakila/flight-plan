import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import DefaultConfigurationForm from "@flightplan/ui/DefaultConfigurationForm"

type DefaultConfigurationFormProps = React.ComponentProps<typeof DefaultConfigurationForm>

interface ConfigurationStepProps extends Omit<DefaultConfigurationFormProps, "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Choose a default prompt configuration"

const ConfigurationStep = ({ backStep, problem, isPending, ...form }: ConfigurationStepProps) => (
  <>
    <StepIntro title={TITLE}>
      A prompt configuration is the set of instructions the agent follows when it writes a review: the tone it writes
      in, how it words each part, and which sections it includes. The structure of a review stays the same.
    </StepIntro>
    <DefaultConfigurationForm {...form}>
      <ul className="max-w-[62ch] list-disc pt-4 pl-5 text-sm text-muted-foreground">
        <li>You can pick another prompt configuration each time you create a Flight Plan.</li>
        <li>You can make your own later, in the settings.</li>
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
