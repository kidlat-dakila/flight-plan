import type { FieldConfiguration } from "./preferences"

/**
 * Reads a markdown file by its path, relative to a tree root (a profile's
 * instructions, or the shipped descriptions). Returns `undefined` when there is
 * no such file, so a caller can fall back or throw as fits.
 */
export type InstructionReader = (relPath: string) => string | undefined

/**
 * Resolve a field's description: what it is, its shape, example values. Read
 * from the shipped `field_descriptions` tree. Throws when missing rather than
 * returning blank — every field has one.
 */
export function resolveDescription(
  config: FieldConfiguration,
  read: InstructionReader,
): string {
  const body = read(config.fieldDescription)
  if (body === undefined) {
    throw new Error(`No field description for "${config.fieldDescription}".`)
  }
  return body
}

/**
 * Resolve an editable field's how-to-write instruction, read from the active
 * profile. Only editable fields have one; a static field returns `undefined`.
 */
export function resolveInstruction(
  config: FieldConfiguration,
  read: InstructionReader,
): string | undefined {
  if (config.configurationType !== "editable") return undefined
  const body = read(config.defaultInstruction)
  if (body === undefined) {
    throw new Error(`No instruction for "${config.defaultInstruction}".`)
  }
  return body
}

/**
 * Resolve an enum field's per-option meanings. `undefined` when the field is
 * not an enum.
 *
 * An editable field's options are instructions like its how-to, so each is a
 * file read from the active profile, and a missing one throws for the same
 * reason `resolveInstruction` does. A static field's options are shipped
 * descriptions: a `.md` value is read, an inline one-liner is used as-is.
 */
export function resolveValues(
  config: FieldConfiguration,
  instructionRead: InstructionReader,
  descriptionRead: InstructionReader,
): Record<string, string> | undefined {
  if (!config.values) return undefined
  const resolved: Record<string, string> = {}
  for (const [option, value] of Object.entries(config.values)) {
    if (config.configurationType === "editable") {
      const body = instructionRead(value)
      if (body === undefined) throw new Error(`No instruction for option "${option}" at "${value}".`)
      resolved[option] = body
    } else {
      resolved[option] = value.endsWith(".md") ? (descriptionRead(value) ?? value) : value
    }
  }
  return resolved
}
