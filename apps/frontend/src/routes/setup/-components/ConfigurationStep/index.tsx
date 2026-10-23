import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import ReviewConfigurationForm from "@flightplan/ui/ReviewConfigurationForm"

type ReviewConfigurationFormProps<Classification extends string> = React.ComponentProps<
  typeof ReviewConfigurationForm<Classification>
>

type ConfigurationStepProps<Classification extends string> = Omit<ReviewConfigurationFormProps<Classification>, "problem" | "children"> & {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

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
    onSubmit={onSubmit}
  >
    <StepActions
      backStep={backStep}
      submitLabel="Finish setup"
      pendingLabel="Finishing…"
      isPending={isPending}
      errorMessage={problem !== null && problem.field === null ? problem.message : null}
      onTroubleshoot={problem?.onTroubleshoot ?? null}
    />
  </ReviewConfigurationForm>
)

export default ConfigurationStep
