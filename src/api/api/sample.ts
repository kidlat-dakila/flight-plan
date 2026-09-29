import {
  DRAFTING_STEPS,
  REPO,
  SAMPLE_AT,
  SAMPLE_BARE_HEADER,
  SAMPLE_FAILED,
  SAMPLE_HEADER,
  SAMPLE_MISSING,
  SAMPLE_NOTICES,
  SAMPLE_OPENABLE,
  SAMPLE_REVIEWED,
  SAMPLE_WAITING,
  isPanelSample,
  isSampleName,
  sampleCoverage,
  sampleLinks,
  servedFile,
  type SampleName,
} from "../utils/samples/index"
import { storeSample } from "../utils/samples/store"
import type { StoredDocument } from "../../lib/schemas/document/stored"
import { installedTheme } from "../../utils/theme"
import { EMPTY_CONTEXT, type PanelContext } from "../../utils/pr/context"
import { NO_MARKS, applyChange, type ReviewedMarks } from "../utils/reviewed/marks"
import type { ReviewedStore } from "../utils/reviewed/store"
import { HttpError, type ApiId, type ArtifactResult, type Backend } from "./backend"

/**
 * The samples as an API: generated documents, a fake adapter, invented files
 *.
 *
 * Everything a real panel reads has a sample here, so the UI has no special
 * path for a sample: the same routes, the same shapes. The only query
 * parameters are the ones a sample needs to show a state a real document
 * shows at a different time: `step` holds `drafting` at one write, `stale`
 * (`=info`, `=git`) adds a notice, `bare` gives the plain-git header.
 */

/** `sample` alone is the walkthrough. */
function nameOf(id: ApiId): string {
  if (!("sample" in id)) {
    throw new HttpError(404, "This API serves only the samples: /api/artifact/sample, /api/artifact/sample/{name}.")
  }
  return id.sample === "" ? "walkthrough" : id.sample
}

/** How long each drafting step shows before the next write arrives. */
export const DRAFTING_TICK_MS = 2500

/**
 * After this long with no request, `drafting` starts again from the opening.
 *
 * Longer than a reader's poll interval, so a page watching it fill in never
 * sees it restart; shorter than a reload after it finished, so a reload shows
 * it fill in again.
 */
export const DRAFTING_IDLE_MS = 10_000

export function createSampleBackend(options: {
  reviewed: ReviewedStore
  /** For tests: the clock the drafting sample advances by. */
  now?: () => number
}): Backend {
  const now = options.now ?? (() => Date.now())
  const clock = { startedAt: 0, lastSeen: Number.NEGATIVE_INFINITY }

  const stepOf = (query: URLSearchParams): number => {
    const held = query.get("step")
    if (held !== null) {
      const step = Number(held)
      if (!Number.isInteger(step) || step < 0 || step >= DRAFTING_STEPS) {
        throw new HttpError(400, `step must be a whole number from 0 to ${String(DRAFTING_STEPS - 1)}.`)
      }
      return step
    }
    const at = now()
    if (at - clock.lastSeen > DRAFTING_IDLE_MS) clock.startedAt = at
    clock.lastSeen = at
    return Math.min(DRAFTING_STEPS - 1, Math.floor((at - clock.startedAt) / DRAFTING_TICK_MS))
  }

  // One stored copy per sample and step: storing runs the resolver.
  const stored = new Map<string, Promise<StoredDocument>>()
  const documentOf = (name: SampleName, step: number): Promise<StoredDocument> => {
    const key = `${name}@${String(step)}`
    let pending = stored.get(key)
    if (pending === undefined) {
      pending = storeSample(name, step).then((sample) => sample.document)
      // A failure is not cached, so a fixed generator is picked up at once.
      pending.catch(() => stored.delete(key))
      stored.set(key, pending)
    }
    return pending
  }

  const documentFor = (name: string, query: URLSearchParams): Promise<StoredDocument> | null => {
    if (!isSampleName(name)) return null
    return documentOf(name, name === "drafting" ? stepOf(query) : DRAFTING_STEPS - 1)
  }

  const unknown = (name: string): HttpError =>
    new HttpError(404, `No sample is called "${name}".`)

  return {
    artifact: async (id, query): Promise<ArtifactResult> => {
      const name = nameOf(id)
      if (name === "missing") return { state: "missing", missing: SAMPLE_MISSING }
      if (name === "failed") return { state: "failed", message: SAMPLE_FAILED.message }
      if (name === "waiting") return { state: "waiting" }
      const pending = documentFor(name, query)
      if (pending === null) throw unknown(name)
      return { state: "document", document: await pending }
    },

    context: async (id, query): Promise<PanelContext> => {
      const name = nameOf(id)
      const waiting = SAMPLE_WAITING.text
      if (isPanelSample(name)) {
        const header = query.has("bare") ? SAMPLE_BARE_HEADER : SAMPLE_HEADER
        return { ...EMPTY_CONTEXT, header, waiting }
      }
      const pending = documentFor(name, query)
      if (pending === null) throw unknown(name)
      const document = await pending
      const at = SAMPLE_AT
      if (document.meta.kind !== "walkthrough") {
        return { ...EMPTY_CONTEXT, openable: SAMPLE_OPENABLE, at, waiting }
      }
      // A branch reviewed with plain git has no pull request to show people from.
      const byBranch = "branch" in document.meta.at
      const stale = query.get("stale")
      return {
        header: query.has("bare") || byBranch ? SAMPLE_BARE_HEADER : SAMPLE_HEADER,
        notice: !query.has("stale")
          ? null
          : stale === "info"
            ? SAMPLE_NOTICES.info
            : stale === "git"
              ? SAMPLE_NOTICES.git
              : SAMPLE_NOTICES.warn,
        links: sampleLinks(Object.keys(document.sources)),
        coverage: sampleCoverage(document.codeWalkthrough.files.map((file) => file.path)),
        openable: SAMPLE_OPENABLE,
        at,
        // Nothing can regenerate a sample, so there is no prompt to copy.
        prompts: null,
        waiting,
      }
    },

    /*
     * The served files, whatever the commit.
     *
     * Two of them drift from the text the documents were written against, on
     * purpose, so the repaired and lost anchors render. A real file at a pinned
     * commit never drifts.
     */
    file: (repo, _sha, path) => {
      const text = repo === REPO ? servedFile(path) : null
      if (text === null) return Promise.reject(new HttpError(404, `${path} is not in the sample repository.`))
      return Promise.resolve(text)
    },

    theme: () => installedTheme(),

    reviewed: options.reviewed,

    seedReviewed: (id, document): ReviewedMarks | null => {
      if (!("sample" in id)) return null
      const seed = SAMPLE_REVIEWED[nameOf(id)]
      if (seed === undefined) return null
      let marks = NO_MARKS
      for (const file of seed.files) {
        marks = applyChange(document, marks, { op: "mark", target: { file } })
      }
      for (const waypoint of seed.waypoints) {
        marks = applyChange(document, marks, { op: "mark", target: { waypoint } })
      }
      return marks
    },
  }
}
