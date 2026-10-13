import { nameProblemOf } from "@/procedures/create-configuration/utils/plan-creation"
import type { InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { presetKeysOf } from "@/procedures/get-instructions/utils/resolve-instructions"
import {
  EDITABLE_FIELDS,
  shippedTextOf,
  SWITCH_LABELS,
  SWITCHABLE_SECTIONS,
  type Configuration,
} from "@/procedures/list-configurations/utils/configuration"
import { CONTEXT_CODE_BLOCK_KINDS } from "@flightplan/configurations"
import type { SaveConfigurationInput } from "./schemas"

export type ChangePlan
  = | { readonly kind: "planned", readonly configuration: Configuration, readonly message: string }
    | { readonly kind: "rejected", readonly message: string }

type ChangeOf<Change extends SaveConfigurationInput["change"]> = Extract<SaveConfigurationInput, { change: Change }>

const NO_FIELD_MESSAGE = "This configuration has no such field. Nothing was saved."
const EMPTY_TEXT_MESSAGE = "An instruction cannot be empty. Write it, or reset the field."
const PRESET_NAME_MESSAGE = "A preset keeps its name. Duplicate it to name your own."

const rejected = (message: string): ChangePlan => ({ kind: "rejected", message })

const withoutKeys = (instructions: Readonly<Record<string, string>>, keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(Object.entries(instructions).filter(([key]) => !keys.includes(key)))

const planFieldChange = (configuration: Configuration, change: ChangeOf<"field">, texts: InstructionTexts): ChangePlan => {
  const field = EDITABLE_FIELDS.find((editable) => editable.path === change.path)
  if (field === undefined) return rejected(NO_FIELD_MESSAGE)
  const fieldKeys = presetKeysOf(field)
  if (change.texts.some((written) => !fieldKeys.includes(written.key))) return rejected(NO_FIELD_MESSAGE)
  if (change.texts.some((written) => written.text.trim() === "")) return rejected(EMPTY_TEXT_MESSAGE)
  const changedTexts = change.texts.filter((written) => written.text !== shippedTextOf(texts, configuration, written.key))
  return {
    kind: "planned",
    message: "This field is saved.",
    configuration: {
      ...configuration,
      instructions: {
        ...withoutKeys(configuration.instructions, change.texts.map((written) => written.key)),
        ...Object.fromEntries(changedTexts.map((written) => [written.key, written.text])),
      },
    },
  }
}

const planReset = (configuration: Configuration, change: ChangeOf<"reset">): ChangePlan => {
  const field = EDITABLE_FIELDS.find((editable) => editable.path === change.path)
  if (field === undefined) return rejected(NO_FIELD_MESSAGE)
  return {
    kind: "planned",
    message: "This field is reset.",
    configuration: { ...configuration, instructions: withoutKeys(configuration.instructions, presetKeysOf(field)) },
  }
}

const planSwitches = (configuration: Configuration, change: ChangeOf<"switches">): ChangePlan => ({
  kind: "planned",
  message: "The sections are saved.",
  configuration: {
    ...configuration,
    sections: {
      ...configuration.sections,
      ...Object.fromEntries(SWITCHABLE_SECTIONS.map((section) => [section, change.sections.includes(section)])),
    },
    contextCodeBlockKinds: CONTEXT_CODE_BLOCK_KINDS.filter((kind) => change.contextCodeBlockKinds.includes(kind)),
  },
})

const planSection = (configuration: Configuration, change: ChangeOf<"section">): ChangePlan => ({
  kind: "planned",
  message: `${SWITCH_LABELS[change.section]}: ${change.isOn ? "switched on" : "switched off"}.`,
  configuration: { ...configuration, sections: { ...configuration.sections, [change.section]: change.isOn } },
})

const planRename = (
  configuration: Configuration,
  change: ChangeOf<"rename">,
  otherConfigurations: readonly Configuration[],
): ChangePlan => {
  if (configuration.isPreset) return rejected(PRESET_NAME_MESSAGE)
  const name = change.name.trim()
  const nameProblem = nameProblemOf(name, otherConfigurations)
  return nameProblem === null
    ? { kind: "planned", message: "The name is saved.", configuration: { ...configuration, name } }
    : rejected(nameProblem)
}

export const planChange = (
  configurations: readonly Configuration[],
  change: SaveConfigurationInput,
  texts: InstructionTexts,
  missingMessage: string,
): ChangePlan => {
  const configuration = configurations.find((listed) => listed.id === change.id)
  if (configuration === undefined) return rejected(missingMessage)
  if (change.change === "field") return planFieldChange(configuration, change, texts)
  if (change.change === "reset") return planReset(configuration, change)
  if (change.change === "switches") return planSwitches(configuration, change)
  if (change.change === "section") return planSection(configuration, change)
  return planRename(configuration, change, configurations.filter((listed) => listed.id !== change.id))
}
