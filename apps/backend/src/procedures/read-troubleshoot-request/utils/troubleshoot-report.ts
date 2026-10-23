import type { ErrorEntry, TroubleshootRequest } from "@/procedures/record-error/utils/schemas"
import type { TroubleshootReport } from "./schemas"

export const REPOSITORY_URL = "https://github.com/kidlat-dakila/flight-plan"
export const MAX_ISSUE_URL_LENGTH = 6500

const RAW_REPOSITORY_URL = "https://raw.githubusercontent.com/kidlat-dakila/flight-plan"
const DOCS_PATH = "packages/docs/src"
const DEFAULT_BRANCH = "main"

export interface TroubleshootReportFacts {
  readonly request: TroubleshootRequest | null
  readonly error: ErrorEntry | null
  readonly recentErrors: readonly ErrorEntry[]
  readonly logsFolder: string
}

export const sourceRefOf = (version: string | null): string => (version === null ? DEFAULT_BRANCH : `v${version}`)

const versionOf = ({ request, error }: TroubleshootReportFacts): string | null => request?.version ?? error?.version ?? null

export const buildTroubleshootReport = (facts: TroubleshootReportFacts): TroubleshootReport => {
  const version = versionOf(facts)
  const ref = sourceRefOf(version)
  return {
    request: facts.request,
    error: facts.error,
    recentErrors: [...facts.recentErrors],
    logsFolder: facts.logsFolder,
    flightPlan: {
      version,
      sourceUrl: `${REPOSITORY_URL}/tree/${ref}`,
      docsUrl: `${REPOSITORY_URL}/tree/${ref}/${DOCS_PATH}`,
      rawDocsUrl: `${RAW_REPOSITORY_URL}/${ref}/${DOCS_PATH}`,
    },
    issue: { newIssueUrl: `${REPOSITORY_URL}/issues/new`, maxUrlLength: MAX_ISSUE_URL_LENGTH },
  }
}
