import { useId } from "react"
import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import DefaultConfigurationForm from "@flightplan/ui/DefaultConfigurationForm"

type DefaultConfigurationFormProps = React.ComponentProps<typeof DefaultConfigurationForm>

interface ConfigurationStepProps extends Omit<DefaultConfigurationFormProps, "children"> {
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
}

const TITLE = "Review configuration"
const PROMPT_CONFIGURATION_HEADING = "Prompt configuration"

const ConfigurationStep = ({ backStep, problem, isPending, ...form }: ConfigurationStepProps) => {
  const promptConfigurationHeadingId = useId()
  return (
    <>
      <StepIntro title={TITLE}>
        Choose how Flight Plan puts your reviews together. You can change each choice later in the settings.
      </StepIntro>
      <section aria-labelledby={promptConfigurationHeadingId}>
        <h3 id={promptConfigurationHeadingId} className="text-lg leading-7 font-semibold text-signal-text">
          {PROMPT_CONFIGURATION_HEADING}
        </h3>
        <p className="mt-1 max-w-[62ch] pb-4 text-muted-foreground">
          A prompt configuration is the set of instructions the agent follows when it writes a review: the tone it writes
          in, how it words each part, and which sections it includes. The structure of a review stays the same.
        </p>
        <DefaultConfigurationForm {...form}>
          <ul className="max-w-[62ch] list-disc pt-4 pl-5 text-sm text-muted-foreground">
            <li>You can pick another prompt configuration each time you create a Flight Plan.</li>
            <li>You can make your own later, in the settings.</li>
          </ul>
          <StepActions
            backStep={backStep}
            submitLabel="Finish setup"
            pendingLabel="Finishing…"
            isPending={isPending}
            errorMessage={problem?.message ?? null}
          />
        </DefaultConfigurationForm>
      </section>
    </>
  )
}

export default ConfigurationStep
