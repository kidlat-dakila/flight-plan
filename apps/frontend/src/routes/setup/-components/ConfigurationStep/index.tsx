import { useId, useState } from "react"
import StepActions, { type StepProblem } from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"

type PresetName = "standard" | "minimal" | "onboardee" | "unfamiliar-territory"

interface PresetOption {
  readonly preset: PresetName
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

interface ConfigurationStepProps {
  readonly presets: readonly PresetOption[]
  readonly selectedPreset: PresetName
  readonly backStep: string | null
  readonly problem: StepProblem | null
  readonly isPending: boolean
  readonly onSubmit: (preset: PresetName) => void
}

const TITLE = "Choose a default configuration"

const ConfigurationStep = ({
  presets,
  selectedPreset,
  backStep,
  problem,
  isPending,
  onSubmit,
}: ConfigurationStepProps) => {
  const groupId = useId()
  const [chosenPreset, setChosenPreset] = useState(selectedPreset)
  return (
    <form action={() => { onSubmit(chosenPreset) }}>
      <StepIntro title={TITLE}>
        A configuration decides how the agent writes a review: the voice of its prose, how each part is worded, and
        which sections it generates. The structure of a review stays the same.
      </StepIntro>
      <ul className="border-t border-border">
        {presets.map((option) => (
          <li key={option.preset} className="border-b border-border py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={groupId}
                checked={chosenPreset === option.preset}
                className="mt-1 size-4 shrink-0 accent-(--primary)"
                onChange={() => { setChosenPreset(option.preset) }}
              />
              <span className="min-w-0">
                <span className="block font-bold">{option.label}</span>
                <span className="block max-w-[62ch] text-sm">{option.bestFor}</span>
                <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.description}</span>
                {option.note === null
                  ? null
                  : <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.note}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
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
    </form>
  )
}

export default ConfigurationStep
