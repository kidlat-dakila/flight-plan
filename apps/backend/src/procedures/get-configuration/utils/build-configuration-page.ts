import type { InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import { originLabelOf } from "@/procedures/list-configurations/utils/build-configuration-row"
import {
  areSwitchesChanged,
  EDITABLE_FIELDS,
  isFieldChanged,
  isFieldOff,
  isKeyChanged,
  shippedTextOf,
  SWITCH_LABELS,
  SWITCHABLE_SECTIONS,
  writtenTextOf,
  type Configuration,
} from "@/procedures/list-configurations/utils/configuration"
import {
  CONTEXT_CODE_BLOCK_KINDS,
  CONTEXT_CODE_BLOCKS_FIELD_PATH,
  instructionFileKey,
  SECTION_FIELD_PATHS,
  type ContextCodeBlockKind,
  type InstructionField,
} from "@flightplan/configurations"
import type { ConfigurationPage, FieldPanel, IndexEntry, IndexGroup, SwitchesPanel } from "./schemas"

export const SWITCHES_KEY = "sections"

type FoundPage = Extract<ConfigurationPage, { kind: "found" }>
type EntryMark = IndexEntry["mark"]

const PATH_SEPARATOR = "."
const SWITCHES_LABEL = "Sections"
const DUPLICATE_LABEL = "Duplicate"
const DESCRIPTION_LABEL = "What Flight Plan tells the agent this field is"
const OFF_MESSAGE = "This field is not written while its section is switched off. You can still change its instruction."
const ALWAYS_WRITTEN_NOTE = "The Context Section and the Code Walkthrough are always written."

const MARK_LABELS: Readonly<Record<EntryMark, string>> = {
  changed: "Changed",
  unchanged: "Not changed",
  off: "Switched off",
}

const FIELD_GROUPS: readonly { readonly title: string, readonly rootPath: string }[] = [
  { title: "Voice", rootPath: "writingStyle" },
  { title: "Context", rootPath: "context" },
  { title: "Journey Flow Diagram", rootPath: SECTION_FIELD_PATHS.journey },
  { title: "Blast Diagram", rootPath: SECTION_FIELD_PATHS.blast },
  { title: "Findings", rootPath: SECTION_FIELD_PATHS.findings },
  { title: "Code Walkthrough", rootPath: SECTION_FIELD_PATHS.walkthrough },
  { title: "Context code blocks", rootPath: CONTEXT_CODE_BLOCKS_FIELD_PATH },
]

const SWITCH_DESCRIPTIONS: Readonly<Record<(typeof SWITCHABLE_SECTIONS)[number], string>> = {
  journey: "The diagrams that show how the changed code runs, from what starts it to what it reaches.",
  blast: "The diagram of the files the change can affect, with what it does to each.",
  findings: "The bugs, risks, nits and questions the agent reports on a waypoint of the Code Walkthrough.",
}

const CONTEXT_KIND_LABELS: Readonly<Record<ContextCodeBlockKind, string>> = {
  codebase: "Code of the repository",
  library: "Libraries",
  language: "Language",
}

const CONTEXT_KIND_DESCRIPTIONS: Readonly<Record<ContextCodeBlockKind, string>> = {
  codebase: "What a function, a component or a type of the repository is, what it does and where it is used.",
  library: "What a name that comes from a library is and what it does.",
  language: "What a name of the language itself is and what it does.",
}

const isUnder = (path: string, rootPath: string): boolean =>
  path === rootPath || path.startsWith(`${rootPath}${PATH_SEPARATOR}`)

const groupTitleOf = (path: string): string | null =>
  FIELD_GROUPS.find((group) => isUnder(path, group.rootPath))?.title ?? null

const titleOf = (field: InstructionField): string =>
  field.configuration.configurationType === "editable" ? field.configuration._ui.title : field.title

const markOf = (configuration: Configuration, texts: InstructionTexts, field: InstructionField): EntryMark => {
  if (isFieldOff(configuration, field.path)) return "off"
  return isFieldChanged(texts, configuration, field) ? "changed" : "unchanged"
}

const fieldEntryOf = (configuration: Configuration, texts: InstructionTexts, openKey: string) =>
  (field: InstructionField): IndexEntry => {
    const mark = markOf(configuration, texts, field)
    return { key: field.path, label: titleOf(field), mark, markLabel: MARK_LABELS[mark], isOpen: field.path === openKey }
  }

const switchesEntryOf = (configuration: Configuration, openKey: string): IndexEntry => {
  const mark: EntryMark = areSwitchesChanged(configuration) ? "changed" : "unchanged"
  return { key: SWITCHES_KEY, label: SWITCHES_LABEL, mark, markLabel: MARK_LABELS[mark], isOpen: openKey === SWITCHES_KEY }
}

const buildIndex = (configuration: Configuration, texts: InstructionTexts, openKey: string): IndexGroup[] => [
  { title: null, entries: [switchesEntryOf(configuration, openKey)] },
  ...FIELD_GROUPS
    .map((group) => ({
      title: group.title,
      entries: EDITABLE_FIELDS
        .filter((field) => groupTitleOf(field.path) === group.title)
        .map(fieldEntryOf(configuration, texts, openKey)),
    }))
    .filter((group) => group.entries.length > 0),
]

const buildSwitchesPanel = (configuration: Configuration): SwitchesPanel => ({
  kind: "switches",
  title: SWITCHES_LABEL,
  summary: "Which optional parts of a review the agent writes. A part that is off can still be generated on demand from the review.",
  sectionsTitle: "Optional sections",
  sections: SWITCHABLE_SECTIONS.map((section) => ({
    section,
    label: SWITCH_LABELS[section],
    description: SWITCH_DESCRIPTIONS[section],
    isOn: configuration.sections[section],
  })),
  alwaysWrittenNote: ALWAYS_WRITTEN_NOTE,
  contextKindsTitle: "Context code blocks",
  contextKindsHint: "A description the reader opens by hovering a name in the code. Pick the kinds of name the agent describes.",
  contextKinds: CONTEXT_CODE_BLOCK_KINDS.map((kind) => ({
    kind,
    label: CONTEXT_KIND_LABELS[kind],
    description: CONTEXT_KIND_DESCRIPTIONS[kind],
    isRequired: configuration.contextCodeBlockKinds.includes(kind),
  })),
})

const shippedLabelOf = (configuration: Configuration): string =>
  configuration.isPreset
    ? `${configuration.name}'s instruction as it shipped`
    : `${PRESET_OFFERS[configuration.preset].label}'s instruction`

const resetLabelOf = (configuration: Configuration): string =>
  configuration.isPreset ? "Reset to the shipped instruction" : `Reset to ${PRESET_OFFERS[configuration.preset].label}`

const buildFieldPanel = (configuration: Configuration, texts: InstructionTexts, field: InstructionField): FieldPanel => {
  const instructionKey = instructionFileKey(field.path)
  const textOf = (key: string, label: string) => ({
    key,
    label,
    value: writtenTextOf(texts, configuration, key),
    shippedValue: shippedTextOf(texts, configuration, key),
    shippedLabel: shippedLabelOf(configuration),
    isChanged: isKeyChanged(texts, configuration, key),
  })
  return {
    kind: "field",
    path: field.path,
    title: titleOf(field),
    summary: field.title,
    descriptionLabel: DESCRIPTION_LABEL,
    description: texts.system.get(instructionKey) ?? "",
    offMessage: isFieldOff(configuration, field.path) ? OFF_MESSAGE : null,
    texts: [
      textOf(instructionKey, "How to write it"),
      ...field.options.map((option) => textOf(instructionFileKey(field.path, option), `What "${option}" means`)),
    ],
    resetLabel: isFieldChanged(texts, configuration, field) ? resetLabelOf(configuration) : null,
  }
}

const PRESET_NOTICE = {
  lead: "A release of Flight Plan can overwrite what you change in a preset.",
  advice: "Duplicate it to keep your changes.",
}

export const buildConfigurationPage = (
  configuration: Configuration,
  texts: InstructionTexts,
  requestedField: string | null,
): FoundPage => {
  const openField = EDITABLE_FIELDS.find((field) => field.path === requestedField) ?? null
  return {
    kind: "found",
    id: configuration.id,
    name: configuration.name,
    originLabel: originLabelOf(configuration),
    notice: configuration.isPreset ? PRESET_NOTICE : null,
    canRename: !configuration.isPreset,
    canDelete: !configuration.isPreset,
    duplicateLabel: DUPLICATE_LABEL,
    index: buildIndex(configuration, texts, openField?.path ?? SWITCHES_KEY),
    panel: openField === null ? buildSwitchesPanel(configuration) : buildFieldPanel(configuration, texts, openField),
  }
}
