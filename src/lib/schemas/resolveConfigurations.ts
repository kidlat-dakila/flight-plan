import { buildExample } from "./buildExample"
import type { Sections } from "./defaultProfile"
import { configurations } from "./preferences"
import { resolveDescription, resolveInstruction, resolveValues } from "./resolveInstruction"
import type { InstructionReader } from "./resolveInstruction"
import type { ConfigEntry } from "./walkConfigurations"
import { listArtifactConfigurations } from "./walkConfigurations"

/** One configuration resolved against a profile. */
export type ResolvedConfig = {
  path: string[]
  configurationType: "editable" | "static"
  /** How the settings screen renders it. Present only on editable fields. */
  ui?: { title: string; description: string }
  /** What the field is: shape and example values. Shipped, fixed. */
  fieldDescription: string
  /** How to write it, from the active profile. Present only on editable fields. */
  instruction?: string
  /** Per-option meanings, on an enum field. */
  values?: Record<string, string>
  /** An assembled example of this field's value, built from leaf exampleValues. */
  example?: unknown
}

/** The whole configuration surface, resolved against one profile. */
export type ResolvedConfigurations = {
  sections: Sections
  configs: ResolvedConfig[]
}

/**
 * Resolve one walked entry: its description (shipped, through
 * `descriptionRead`) and, when it is editable, its how-to-write instruction
 * (through `instructionRead`, from the active profile). Pure.
 *
 * Exported because `./configurationIndex` resolves a named few rather than all
 * of them, and two copies of this would be two answers to what a resolved
 * configuration contains.
 */
export function resolveConfiguration(
  { path, configuration, schema }: ConfigEntry,
  instructionRead: InstructionReader,
  descriptionRead: InstructionReader,
): ResolvedConfig {
  const values = resolveValues(configuration, instructionRead, descriptionRead)
  const instruction = resolveInstruction(configuration, instructionRead)
  const example = schema ? buildExample(schema, configurations) : undefined
  return {
    path,
    configurationType: configuration.configurationType,
    ...(configuration._ui ? { ui: configuration._ui } : {}),
    fieldDescription: resolveDescription(configuration, descriptionRead),
    ...(instruction !== undefined ? { instruction } : {}),
    ...(values ? { values } : {}),
    ...(example !== undefined ? { example } : {}),
  }
}

/**
 * Resolve every artifact configuration. The whole surface, which is what the
 * settings screen renders; an agent reads `./configurationIndex` instead.
 */
export function resolveConfigurations(
  instructionRead: InstructionReader,
  descriptionRead: InstructionReader,
  sections: Sections,
): ResolvedConfigurations {
  const configs = listArtifactConfigurations().map((entry) =>
    resolveConfiguration(entry, instructionRead, descriptionRead),
  )
  return { sections, configs }
}
