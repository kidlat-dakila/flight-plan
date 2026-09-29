import type { Sections } from "./defaultProfile"
import { resolveConfiguration } from "./resolveConfigurations"
import type { ResolvedConfig } from "./resolveConfigurations"
import type { InstructionReader } from "./resolveInstruction"
import { listArtifactConfigurations } from "./walkConfigurations"

/**
 * The configuration surface, in the two sizes an agent actually reads.
 *
 * `resolveConfigurations` returns everything: seventy-odd fields, each with its
 * description, its instruction, its enum options and a worked example. That is
 * the right answer for the settings screen, which renders all of it, and the
 * wrong one for an agent — some seventy kilobytes, past the inline output cap,
 * paid for on every run before a word is written and mostly about fields the
 * agent has not reached yet.
 *
 * So the agent gets an **index** first and fetches an entry when it reaches the
 * work that entry is about. **Nothing is inlined.** Two entries were, for a
 * while — the voice and the code-link format — on the grounds that they steer
 * every field and fetching them would cost a second call. That reasoning takes
 * the whole payload back one entry at a time: everything steers something, and
 * an index that carries its three most important entries is not an index.
 *
 * An agent writes in phases — the reach, then the tour, then the board — and
 * each phase has an entry. Fetching at the phase boundary is one call for
 * something it is about to use, rather than five thousand tokens of rules for
 * work it has not started.
 */

/** One row of the index: a field an agent can ask for, and what it is for. */
export type ConfigurationIndexEntry = {
  /** The dotted path, which is what `resolveSome` takes back. */
  path: string
  /** The settings screen's title for it, as a one-line reminder of the field. */
  title: string
}

export type ConfigurationIndex = {
  sections: Sections
  /** Everything fetchable, by path. */
  fields: ConfigurationIndexEntry[]
}

/**
 * What the index says about an entry that is not an authored field.
 *
 * The standalone three and the container fields carry rules rather than
 * per-field guidance, and an agent has no `_ui` title to go on for them — so
 * the title is stated here, in the words that say when to fetch it.
 */
const TITLES: Record<string, string> = {
  writingStyle: "The shared voice. Fetch before writing any prose.",
  staticWritingStyle: "How a code link is written. Fixed. Fetch with the voice.",
  documentFormat:
    "The document's shape and what a write is refused for. Fetch before the first write.",
  blast: "The blast radius: how far to assess, and what a verdict means.",
  codeWalkthrough: "The tour: reading order.",
  "codeWalkthrough.files": "File sections: what order, and why tests get none.",
  "codeWalkthrough.files.waypoints":
    "A waypoint's shape, and how to break one down.",
  diagram: "The board: what is a node, the two axes, when there is no flow.",
  findings: "Where a finding lives, what each kind carries, proving a bug.",
}

/**
 * The index: the sections, the two voices, and a list of what can be fetched.
 *
 * Static fields are left out. An agent does not author them — that is what
 * `static` means — so their descriptions are reference material for a reader of
 * the schema, not guidance for a writer. They stay reachable through
 * `resolveSome` for anyone who does want one.
 */
export function configurationIndex(
  _instructionRead: InstructionReader,
  _descriptionRead: InstructionReader,
  sections: Sections,
): ConfigurationIndex {
  const fields: ConfigurationIndexEntry[] = []
  for (const entry of listArtifactConfigurations()) {
    const path = entry.path.join(".")
    const named = TITLES[path]
    /*
     * Listed when it is something an agent fetches: an entry that carries rules
     * (named above) or a field it authors. A static leaf — an id, a hop, a
     * derived range — is reachable by path but not worth a line here, because
     * nothing is written into it.
     */
    if (named !== undefined) fields.push({ path, title: named })
    else if (entry.configuration.configurationType === "editable") {
      fields.push({ path, title: entry.configuration._ui.title })
    }
  }
  return { sections, fields }
}

/**
 * The named fields, resolved whole, with the ones nobody registered named back.
 *
 * Named back rather than dropped: a field that resolves to nothing looks
 * identical to a field with nothing to say, and an agent that cannot tell them
 * apart writes the field from memory and never learns it asked wrongly.
 */
export function resolveSome(
  instructionRead: InstructionReader,
  descriptionRead: InstructionReader,
  paths: readonly string[],
): { configs: ResolvedConfig[]; unknown: string[] } {
  const all = listArtifactConfigurations()
  const byPath = new Map(all.map((one) => [one.path.join("."), one]))

  const configs: ResolvedConfig[] = []
  const unknown: string[] = []
  for (const path of paths) {
    const entry = byPath.get(path)
    if (entry === undefined) unknown.push(path)
    else configs.push(resolveConfiguration(entry, instructionRead, descriptionRead))
  }
  return { configs, unknown }
}

/**
 * The paths a mistyped one probably meant, matched on the last segment.
 *
 * Deliberately not a fuzzy match. The mistake this catches is the one an agent
 * actually makes — writing `label` for `diagram.nodes.label`, the field's name
 * rather than its address — and a spell-checker for the rest would guess where
 * naming the whole index is honest.
 */
export function nearPaths(path: string): string[] {
  const last = path.split(".").at(-1)
  if (last === undefined || last === "") return []
  return listArtifactConfigurations()
    .map((one) => one.path.join("."))
    .filter((known) => known !== path && known.split(".").at(-1) === last)
}
