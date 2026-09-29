import type { InstructionReader } from "./resolveInstruction"
import { shippedInstructions } from "./shippedInstructions"

/**
 * Read a how-to-write instruction from the shipped default profile — the
 * shipped `.md` files, read once at startup. Returns `undefined` for an
 * unknown path.
 */
export const defaultRead: InstructionReader = (relPath) => shippedInstructions().instructions[relPath]

/**
 * Read a field description from the shipped, fixed set. Descriptions are the
 * same for every profile, so this reader has no per-profile variant.
 */
export const descriptionRead: InstructionReader = (relPath) =>
  shippedInstructions().descriptions[relPath]

/** The artifact bodies whose generation the user can turn on or off. */
export const TOGGLEABLE_BODIES = ["diagram", "blast", "codeWalkthrough"] as const

export type ToggleableBody = (typeof TOGGLEABLE_BODIES)[number]

/** The section on/off map a profile carries. */
export type Sections = Record<ToggleableBody, boolean>

/** Every toggleable body on — the default profile's section state. */
export const DEFAULT_SECTIONS: Sections = {
  diagram: true,
  blast: true,
  codeWalkthrough: true,
}
