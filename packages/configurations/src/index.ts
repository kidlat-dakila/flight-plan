export const SYSTEM_INSTRUCTIONS_FOLDER = "system-instructions"
export const DEFAULT_CONFIGURATIONS_FOLDER = "default-configurations"

export const PRESET_NAMES = ["standard", "minimal", "onboardee", "unfamiliar-territory"] as const

export type PresetName = (typeof PRESET_NAMES)[number]

export const BASE_PRESET_NAME: PresetName = "standard"

export const SECTION_NAMES = ["journey", "blast", "walkthrough"] as const

export type SectionName = (typeof SECTION_NAMES)[number]

export type SectionSwitches = Readonly<Record<SectionName, boolean>>

const ALL_SECTIONS_ON: SectionSwitches = { journey: true, blast: true, walkthrough: true }

export const PRESET_SECTIONS: Readonly<Record<PresetName, SectionSwitches>> = {
  "standard": ALL_SECTIONS_ON,
  "minimal": ALL_SECTIONS_ON,
  "onboardee": ALL_SECTIONS_ON,
  "unfamiliar-territory": ALL_SECTIONS_ON,
}

export interface InstructionField {
  readonly path: string
  readonly title: string
  readonly isEditable: boolean
  readonly options: readonly string[]
  readonly section: SectionName | null
}

const NO_OPTIONS: readonly string[] = []

const staticField = (path: string, title: string, section: SectionName | null): InstructionField => ({
  path,
  title,
  isEditable: false,
  options: NO_OPTIONS,
  section,
})

const editableField = (
  path: string,
  title: string,
  section: SectionName | null,
  options: readonly string[] = NO_OPTIONS,
): InstructionField => ({ path, title, isEditable: true, options, section })

export const INSTRUCTION_FIELDS: readonly InstructionField[] = [
  editableField("writingStyle", "The shared voice. Fetch before writing any prose.", null),
  staticField("codeLinks", "How a code link is written and what it can point at. Fetch with the voice.", null),
  staticField("artifactFormat", "The artifact's shape, what you write, and what a write is refused for. Fetch before the first write.", null),
  staticField("context", "The Context Section: its three parts.", null),
  editableField("context.context", "Why anyone should care about the change.", null),
  staticField("context.overview", "The scenarios that changed, seen from outside the code.", null),
  editableField("context.overview.when", "A scenario's situation.", null),
  editableField("context.overview.then", "What can be observed in that situation.", null),
  staticField("context.implementation", "What changed inside the code, grouped by place.", null),
  editableField("context.implementation.label", "The place a group of changes lives.", null),
  editableField("context.implementation.items", "One change a reader would notice.", null),
  staticField("journey", "The Journey Flow Diagram: what its nodes are, and what is yours to write on them.", "journey"),
  editableField("journey.nodes.label", "What a step on the path does.", "journey"),
  editableField("journey.nodes.description", "How a step does it, and why it is on the path.", "journey"),
  staticField("journey.nodes.category", "A node's visual category, and what each one means.", "journey"),
  staticField("blast", "The Blast Diagram: how far to assess, and what a verdict means.", "blast"),
  editableField("blast.nodes.label", "What a declaration on the Blast Diagram is.", "blast"),
  staticField("blast.nodes.contract", "A changed declaration's surface, before and now.", "blast"),
  editableField("blast.nodes.contract.before", "The surface before the change.", "blast"),
  editableField("blast.nodes.contract.now", "The surface after the change.", "blast"),
  editableField("blast.nodes.verdict", "What the change does to a dependent.", "blast", [
    "breaks",
    "behaviour-changes",
    "unaffected",
  ]),
  editableField("blast.nodes.effect", "The one line of evidence for a verdict.", "blast"),
  staticField("walkthrough", "The Code Walkthrough: reading order.", "walkthrough"),
  editableField("walkthrough.intro", "The one line that frames the whole tour.", "walkthrough"),
  staticField("walkthrough.files", "File sections: what order, and why tests get none.", "walkthrough"),
  editableField("walkthrough.files.title", "What the reviewer is shown in one file.", "walkthrough"),
  staticField("walkthrough.files.summary", "A file's items from the implementation list.", "walkthrough"),
  staticField("walkthrough.files.waypoints", "A waypoint's shape, and what the scaffold decided for you.", "walkthrough"),
  editableField("walkthrough.files.waypoints.title", "What was done, and to what.", "walkthrough"),
  editableField("walkthrough.files.waypoints.reading", "What the author changed here, and what it is for.", "walkthrough"),
  editableField("walkthrough.files.waypoints.needsAttention", "Why a waypoint is one of the few to focus on.", "walkthrough"),
  editableField("walkthrough.files.waypoints.findings", "Reporting what is wrong with a waypoint's code.", "walkthrough"),
  staticField("findings", "Where a finding lives, what each kind carries, and proving a bug.", "walkthrough"),
  editableField("findings.kind", "Choosing a finding's kind.", "walkthrough", ["bug", "risk", "nit", "question"]),
  editableField("findings.title", "A finding's one-line heading.", "walkthrough"),
  editableField("findings.reading", "The defect, one linked claim at a time.", "walkthrough"),
  editableField("findings.trace", "The steps that prove a finding.", "walkthrough"),
  editableField("findings.solution", "The lines as they should be.", "walkthrough"),
]

export const instructionFileKey = (path: string, option: string | null = null): string =>
  option === null ? path : `${path}.${option}`

export const systemInstructionKeys = (): string[] => INSTRUCTION_FIELDS.map((field) => instructionFileKey(field.path))

export const presetInstructionKeys = (): string[] =>
  INSTRUCTION_FIELDS
    .filter((field) => field.isEditable)
    .flatMap((field) => [
      instructionFileKey(field.path),
      ...field.options.map((option) => instructionFileKey(field.path, option)),
    ])
