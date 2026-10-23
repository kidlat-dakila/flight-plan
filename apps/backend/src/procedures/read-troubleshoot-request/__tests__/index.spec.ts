import { readTroubleshootRequest } from "@/procedures/read-troubleshoot-request"
import { createTestErrorLog, errorEntryOf, LOGS_FOLDER } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import type { TroubleshootRequest } from "@/procedures/record-error/utils/schemas"

const ATTACHED = errorEntryOf("20261023-142000-000009", "The token was refused.")
const OLDER = errorEntryOf("20261023-141000-000008", "Fetch failed.")

const REQUEST: TroubleshootRequest = {
  kind: "request",
  id: "20261023-142530-000001",
  recordedAt: "2026-10-23T14:25:30.000Z",
  description: "I saved the agents.",
  shownError: null,
  page: { path: "/settings/agents", title: "Agents" },
  errorLogId: ATTACHED.id,
  recentErrorLogIds: [OLDER.id, "20261023-130000-000007"],
  agent: "Claude",
  version: "0.1.9",
  platform: "darwin",
}

const FLIGHT_PLAN_AT_RELEASE = {
  version: "0.1.9",
  sourceUrl: "https://github.com/kidlat-dakila/flight-plan/tree/v0.1.9",
  docsUrl: "https://github.com/kidlat-dakila/flight-plan/tree/v0.1.9/packages/docs/src",
  rawDocsUrl: "https://raw.githubusercontent.com/kidlat-dakila/flight-plan/v0.1.9/packages/docs/src",
}

const ISSUE = { newIssueUrl: "https://github.com/kidlat-dakila/flight-plan/issues/new", maxUrlLength: 6500 }

describe("readTroubleshootRequest", () => {
  it("returns the request with its error, the recent errors that still exist and where the docs are", async () => {
    const { errorLog } = createTestErrorLog([REQUEST, ATTACHED, OLDER])

    await expect(readTroubleshootRequest({ logId: REQUEST.id }, { errorLog })).resolves.toStrictEqual({
      kind: "read",
      report: { request: REQUEST, error: ATTACHED, recentErrors: [OLDER], logsFolder: LOGS_FOLDER, flightPlan: FLIGHT_PLAN_AT_RELEASE, issue: ISSUE },
    })
  })

  it("returns one error log when given its id", async () => {
    const { errorLog } = createTestErrorLog([ATTACHED])

    await expect(readTroubleshootRequest({ logId: ATTACHED.id }, { errorLog })).resolves.toMatchObject({
      kind: "read",
      report: { request: null, error: ATTACHED, recentErrors: [] },
    })
  })

  it("points at the main branch for a development build", async () => {
    const { errorLog } = createTestErrorLog([{ ...ATTACHED, version: null }])

    await expect(readTroubleshootRequest({ logId: ATTACHED.id }, { errorLog })).resolves.toMatchObject({
      report: { flightPlan: { version: null, docsUrl: "https://github.com/kidlat-dakila/flight-plan/tree/main/packages/docs/src" } },
    })
  })

  it("refuses an id with no log", async () => {
    const { errorLog } = createTestErrorLog()

    await expect(readTroubleshootRequest({ logId: REQUEST.id }, { errorLog })).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan has no troubleshoot request or error log with the id 20261023-142530-000001. Ask the user for the id Flight Plan showed, or read the newest files in Flight Plan's logs folder.",
    })
  })
})
