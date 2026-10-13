import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

const FLIGHT_PLAN_APP_URL = "http://localhost:4200"
const IMPORT_PATH = "/artifact/claude/download"
const IMPORT_LABEL = "Download to Flight Plan"

export interface ImportLink {
  readonly href: string
  readonly label: string
}

export const buildImportLink = (key: ReviewKey, artifactUrl: string): ImportLink => {
  const search = new URLSearchParams({ artifact: artifactUrl, repository: key.repositoryName, target: key.targetId })
  return { href: `${FLIGHT_PLAN_APP_URL}${IMPORT_PATH}?${search.toString()}`, label: IMPORT_LABEL }
}
