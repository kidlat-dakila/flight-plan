import { type Sections, TOGGLEABLE_BODIES, type ToggleableBody } from "./defaultProfile"
import { resolveDescription, resolveInstruction, resolveValues } from "./resolveInstruction"
import type { InstructionReader } from "./resolveInstruction"
import { listArtifactConfigurations } from "./walkConfigurations"

/**
 * The configuration surface as the settings screen renders it: editable fields
 * grouped by schema section, with the three toggleable bodies. Lives here, not
 * in the webview, so the shapes are shared with the extension and unit-tested,
 * and because `src/lib/schemas` is browser-safe both ends import it.
 */

/** One enum option's meaning, from the active profile, and where it saves. */
export type ConfigValue = { option: string; instruction: string; writePath: string }

/** An editable field: its fixed description, its editable how-to, and where it saves. */
export type ConfigField = {
  kind: "field"
  id: string
  section: string
  title: string
  /** The settings-row helper text (`_ui.description`). */
  description: string
  /** What the field is: shape and example values. Shipped, read-only. */
  fieldDescription: string
  /** How to write it, from the active profile. The editable textarea. */
  instruction: string
  /** The relative path a profile stores this field's instruction override at. */
  writePath: string
  values?: ConfigValue[]
}

/** A toggleable artifact body: generated when on, optional when off. */
export type ConfigBody = {
  kind: "body"
  id: string
  section: string
  body: ToggleableBody
  title: string
  description: string
  on: boolean
}

export type ConfigItem = ConfigField | ConfigBody

export type ConfigGroup = { section: string; title: string; items: ConfigItem[] }

const SECTION_TITLES: Record<string, string> = {
  writingStyle: "Writing style",
  title: "Title",
  contextBody: "Context",
  diagram: "Diagram",
  blast: "Blast radius",
  codeWalkthrough: "Code walkthrough",
  findings: "Findings",
}

const SECTION_ORDER = Object.keys(SECTION_TITLES)

const BODY_TITLES: Record<ToggleableBody, string> = {
  diagram: "Diagram",
  blast: "Blast radius",
  codeWalkthrough: "Code walkthrough",
}

/**
 * Build the grouped configuration view against a profile: every editable field
 * resolved through `read`, plus a body item per toggleable body carrying its
 * on/off state. Pure; `read` and `sections` come from the active profile.
 */
export function buildConfigGroups(
  instructionRead: InstructionReader,
  descriptionRead: InstructionReader,
  sections: Sections,
): ConfigGroup[] {
  const items = new Map<string, ConfigItem[]>()
  const push = (section: string, item: ConfigItem) => {
    const list = items.get(section) ?? []
    list.push(item)
    items.set(section, list)
  }

  // A toggle per body, at the head of its section.
  for (const body of TOGGLEABLE_BODIES) {
    push(body, {
      kind: "body",
      id: `body:${body}`,
      section: body,
      body,
      title: BODY_TITLES[body],
      description: "Whether the agent always generates this section.",
      on: sections[body],
    })
  }

  for (const { path, configuration } of listArtifactConfigurations()) {
    if (configuration.configurationType !== "editable") continue
    const section = path[0] ?? ""
    const resolvedValues = resolveValues(configuration, instructionRead, descriptionRead)
    const values: ConfigValue[] | undefined = resolvedValues
      ? Object.entries(configuration.values ?? {}).map(([option, writePath]) => ({
          option,
          instruction: resolvedValues[option] ?? "",
          writePath,
        }))
      : undefined
    push(section, {
      kind: "field",
      id: path.join("."),
      section,
      title: configuration._ui?.title ?? path.join("."),
      description: configuration._ui?.description ?? "",
      fieldDescription: resolveDescription(configuration, descriptionRead),
      instruction: resolveInstruction(configuration, instructionRead) ?? "",
      writePath: configuration.defaultInstruction,
      ...(values ? { values } : {}),
    })
  }

  return SECTION_ORDER.filter((section) => items.has(section)).map((section) => ({
    section,
    title: SECTION_TITLES[section] ?? section,
    items: items.get(section) ?? [],
  }))
}
