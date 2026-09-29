import type { Kind } from "../../../lib/schemas/document/schema"
import type { Hunk } from "../../../lib/schemas/document/stored"
import { HEAD, MAIN, SERVED_FILES, WRITTEN_FILES, findSymbol } from "./files"
import { planInput } from "./plan"
import { DRAFTING_STEPS, absentInput, draftingInput } from "./variants"
import { WALKTHROUGH_HUNKS, walkthroughInput, type SampleInput } from "./walkthrough"

/**
 * The sample documents, and everything needed to store them.
 *
 * A sample is an authored document plus the repository it was written against:
 * the commit, the mainline, the diff and the files. That is exactly what the
 * server's write path takes, so a sample is stored by running that path rather
 * than by being written out in its stored form — see `storeSample` in the
 * renderer, which runs the resolver and the checks.
 *
 * Here and not beside the resolver because the webview, the renderer's tests
 * and the server all depend on this package already, and it depends on
 * nothing but Zod.
 */

export const SAMPLE_NAMES = ["walkthrough", "absent", "plan", "drafting"] as const
export type SampleName = (typeof SAMPLE_NAMES)[number]

/** Panel states that are not a document. */
export const PANEL_SAMPLES = ["missing", "failed", "waiting"] as const
export type PanelSample = (typeof PANEL_SAMPLES)[number]

export type SampleSpec = {
  kind: Kind
  /** The document as an agent would send it. */
  input: SampleInput
  /** The commit files are read at; null for a plan, which reads the working tree. */
  at: string | null
  /** The mainline commit, for a walkthrough's files outside the diff. */
  main: string | null
  hunks: Record<string, Hunk>
}

export function isSampleName(name: string): name is SampleName {
  return (SAMPLE_NAMES as readonly string[]).includes(name)
}

export function isPanelSample(name: string): name is PanelSample {
  return (PANEL_SAMPLES as readonly string[]).includes(name)
}

/** One sample, ready for the write path. `step` is only read by `drafting`. */
export function sampleSpec(name: SampleName, step = DRAFTING_STEPS - 1): SampleSpec {
  switch (name) {
    case "walkthrough":
      return { kind: "walkthrough", input: walkthroughInput(), at: HEAD, main: MAIN, hunks: WALKTHROUGH_HUNKS }
    case "absent":
      return { kind: "walkthrough", input: absentInput(), at: HEAD, main: MAIN, hunks: WALKTHROUGH_HUNKS }
    case "drafting":
      return {
        kind: "walkthrough",
        input: draftingInput(step),
        at: HEAD,
        main: MAIN,
        hunks: WALKTHROUGH_HUNKS,
      }
    case "plan":
      return { kind: "plan", input: planInput(), at: null, main: null, hunks: {} }
  }
}

/** A file as the documents were written against it. */
export function writtenFile(path: string): string | null {
  return WRITTEN_FILES[path] ?? null
}

/** A file as a reader's panel reads it now. */
export function servedFile(path: string): string | null {
  return SERVED_FILES[path] ?? null
}

export { DRAFTING_STEPS, findSymbol }
export { HEAD, MAIN, REPO, SERVED_FILES, WRITTEN_FILES } from "./files"
export { HELD_SLUG } from "./walkthrough"
export type { SampleInput } from "./walkthrough"
export {
  REVIEW_STATES,
  SAMPLE_AT,
  SAMPLE_BARE_HEADER,
  SAMPLE_FAILED,
  SAMPLE_HEADER,
  SAMPLE_MISSING,
  SAMPLE_NOTICES,
  SAMPLE_OPENABLE,
  SAMPLE_PR,
  SAMPLE_REVIEWED,
  SAMPLE_WAITING,
  sampleCoverage,
  sampleLinks,
} from "./panel"
export type { SampleNoticeKind } from "./panel"
