import type { ReviewTargetLookup } from "@/procedures/get-conversation/utils/review-target"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { importIdOf, type ImportRequest } from "@/procedures/import-review/utils/import-request"
import type { ImportForm } from "./schemas"

export interface ImportFacts {
  readonly key: ReviewKey
  readonly artifactUrl: string
  readonly isArtifactUrl: boolean
  readonly target: ReviewTargetLookup
  readonly hasFlightPlan: boolean
  readonly request: ImportRequest | null
  readonly isImporting: boolean
}

type ImportStanding = Pick<ImportForm, "message" | "warning" | "startsAtOnce" | "submitLabel">

const HEADING = "Download a Flight Plan"
const PENDING_LABEL = "Downloading…"
const NOT_AN_ARTIFACT_MESSAGE = "This link does not name a Claude artifact, so there is nothing to download."

const STARTING: ImportStanding = {
  message: "Your agent fetches the Flight Plan from the Claude artifact and stores it here.",
  warning: null,
  startsAtOnce: true,
  submitLabel: "Download",
}

const IMPORTING: ImportStanding = {
  message: "Your agent is fetching the Flight Plan. It asks in Chat when it needs your permission. This page opens the Flight Plan when it is stored.",
  warning: null,
  startsAtOnce: false,
  submitLabel: null,
}

const FINISHED: ImportStanding = {
  message: "The Flight Plan is stored.",
  warning: null,
  startsAtOnce: false,
  submitLabel: null,
}

const STOPPED: ImportStanding = {
  message: "The agent stopped before the Flight Plan was stored. Chat on the review page has what it said.",
  warning: null,
  startsAtOnce: false,
  submitLabel: "Try again",
}

const REPLACING: ImportStanding = {
  message: STARTING.message,
  warning: "This review target already has a Flight Plan here. Downloading replaces it.",
  startsAtOnce: false,
  submitLabel: "Replace and download",
}

const reviewHrefOf = (key: ReviewKey): string =>
  `/pr-reviews/${encodeURIComponent(key.repositoryName)}/${encodeURIComponent(key.targetId)}`

const refusal = (message: string): ImportForm => ({
  heading: HEADING,
  message,
  details: [],
  warning: null,
  startsAtOnce: false,
  isImporting: false,
  isFinished: false,
  importId: null,
  submitLabel: null,
  pendingLabel: PENDING_LABEL,
  reviewHref: null,
})

const requestOfThisArtifact = (facts: ImportFacts): ImportRequest | null =>
  facts.request?.artifactUrl === facts.artifactUrl ? facts.request : null

const standingOf = (facts: ImportFacts, request: ImportRequest | null): ImportStanding => {
  if (facts.isImporting) return IMPORTING
  if (request !== null && request.importedAt === null) return STOPPED
  if (facts.hasFlightPlan) return REPLACING
  return STARTING
}

export const buildImportForm = (facts: ImportFacts): ImportForm => {
  if (!facts.isArtifactUrl) return refusal(NOT_AN_ARTIFACT_MESSAGE)
  if (facts.target.kind === "rejected") return refusal(facts.target.message)
  const request = requestOfThisArtifact(facts)
  const isFinished = request !== null && request.importedAt !== null
  return {
    heading: HEADING,
    ...(isFinished && !facts.isImporting ? { ...standingOf(facts, request), message: FINISHED.message } : standingOf(facts, request)),
    details: [
      { label: "Repository", value: facts.key.repositoryName },
      { label: "Review target", value: facts.key.targetId },
      { label: "Claude artifact", value: facts.artifactUrl },
    ],
    isImporting: facts.isImporting,
    isFinished,
    importId: request === null ? null : importIdOf(request),
    pendingLabel: PENDING_LABEL,
    reviewHref: reviewHrefOf(facts.key),
  }
}
