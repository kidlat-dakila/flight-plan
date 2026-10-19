import type { InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import { changedFieldsOf, type Configuration } from "./configuration"
import type { ConfigurationRow } from "./schemas"

const SHIPPED_LABEL = "Ships with Flight Plan"
const NOTHING_CHANGED_LABEL = "No instruction changed"
const DUPLICATE_LABEL = "Duplicate"
export const DEFAULT_LABEL = "Default"

const plain = (text: string) => ({ text, kind: "plain" as const })

export const originLabelOf = (configuration: Configuration): string =>
  configuration.isPreset ? SHIPPED_LABEL : `Based on ${PRESET_OFFERS[configuration.preset].label}`

const changeLabelOf = (changedCount: number): string => {
  if (changedCount === 0) return NOTHING_CHANGED_LABEL
  return changedCount === 1 ? "1 instruction changed" : `${String(changedCount)} instructions changed`
}

export const buildConfigurationRow = (
  configuration: Configuration,
  texts: InstructionTexts,
  isDefault: boolean,
): ConfigurationRow => ({
  id: configuration.id,
  name: configuration.name,
  summary: configuration.isPreset ? PRESET_OFFERS[configuration.preset].description : null,
  details: [
    originLabelOf(configuration),
    changeLabelOf(changedFieldsOf(texts, configuration).length),
  ].map(plain),
  defaultLabel: isDefault ? DEFAULT_LABEL : null,
  isDefault,
  defaultChoiceLabel: `Use ${configuration.name} by default`,
  duplicateLabel: DUPLICATE_LABEL,
  duplicateName: `${DUPLICATE_LABEL} ${configuration.name}`,
})
