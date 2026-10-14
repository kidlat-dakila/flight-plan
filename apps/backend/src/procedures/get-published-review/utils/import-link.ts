import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

const IMPORT_PATH = "/artifact/claude/download"
const IMPORT_LABEL = "Download to Flight Plan"

export interface ImportLink {
  readonly href: string
  readonly label: string
}

export const buildImportLink = (key: ReviewKey, artifactUrl: string, appUrl: string): ImportLink => {
  const search = new URLSearchParams({ artifact: artifactUrl, repository: key.repositoryName, target: key.targetId })
  return { href: `${appUrl}${IMPORT_PATH}?${search.toString()}`, label: IMPORT_LABEL }
}
