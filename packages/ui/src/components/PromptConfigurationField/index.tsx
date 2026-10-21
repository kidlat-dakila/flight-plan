import SelectDialog, { type SelectDialogOption } from "@/components/SelectDialog"

export interface PromptConfigurationOption {
  readonly configurationId: string
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

interface PromptConfigurationFieldProps {
  readonly options: readonly PromptConfigurationOption[]
  readonly value: string
  readonly onChange: (configurationId: string) => void
}

const LABEL = "Prompt configuration"
const DIALOG_TITLE = "Choose a prompt configuration"
const DIALOG_DESCRIPTION = "It sets the tone the agent writes in and how it words each part."
const CHOOSE_LABEL = "Choose"
const CANCEL_LABEL = "Cancel"

const toSelectOption = (option: PromptConfigurationOption): SelectDialogOption => ({
  key: option.configurationId,
  label: option.label,
  summary: option.bestFor,
  description: option.description,
  note: option.note,
})

const PromptConfigurationField = ({ options, value, onChange }: PromptConfigurationFieldProps) => (
  <SelectDialog
    label={LABEL}
    dialogTitle={DIALOG_TITLE}
    dialogDescription={DIALOG_DESCRIPTION}
    chooseLabel={CHOOSE_LABEL}
    cancelLabel={CANCEL_LABEL}
    options={options.map(toSelectOption)}
    selectedKey={value}
    onChoose={onChange}
  />
)

export default PromptConfigurationField
