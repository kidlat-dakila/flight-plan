import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import ReviewConfigurationForm from "@flightplan/ui/ReviewConfigurationForm"

type ReviewConfigurationFormProps<Classification extends string> = React.ComponentProps<
  typeof ReviewConfigurationForm<Classification>
>

type ConfigurationStepProps<Classification extends string> = Omit<ReviewConfigurationFormProps<Classification>, "problem" | "promptConfigurationNotes" | "children"> & {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const PROMPT_CONFIGURATION_NOTES = [
  "You can pick another prompt configuration each time you create a Flight Plan.",
  "You can make your own later, in the settings.",
]

const ConfigurationStep = <Classification extends string>({
  presets,
  selectedConfigurationId,
  preferences,
  spotlightGroups,
  backStep,
  problem,
  isPending,
  onSubmit,
}: ConfigurationStepProps<Classification>) => (
  <ReviewConfigurationForm
    presets={presets}
    selectedConfigurationId={selectedConfigurationId}
    preferences={preferences}
    spotlightGroups={spotlightGroups}
    problem={problem}
    promptConfigurationNotes={PROMPT_CONFIGURATION_NOTES}
    onSubmit={onSubmit}
  >
    <StepActions
      backStep={backStep}
      submitLabel="Finish setup"
      pendingLabel="Finishing…"
      isPending={isPending}
      errorMessage={problem !== null && problem.field === null ? problem.message : null}
    />
  </ReviewConfigurationForm>
)

export default ConfigurationStep
