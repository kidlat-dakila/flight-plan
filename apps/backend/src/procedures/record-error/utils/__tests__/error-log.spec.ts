import { REPEAT_WINDOW_MS, reportOf, toErrorEntry } from "@/procedures/record-error/utils/error-log"
import { MAX_MESSAGE_LENGTH } from "@/procedures/record-error/utils/schemas"
import { createTestErrorLog, FACTS, LOGS_FOLDER } from "./error-log-fixture"

const STAMP = { id: "20261023-142530-000001", recordedAt: "2026-10-23T14:25:30.000Z" }

const PAGE = { path: "/settings/agents", title: "Agents" }

describe("reportOf", () => {
  it("takes the message and the stack of an error, with its causes", () => {
    const failure = new Error("Could not list branches.", { cause: new TypeError("fetch failed") })

    const report = reportOf("Forge github listBranches", failure)

    expect(report.message).toBe("Could not list branches.")
    expect(report.stack).toContain("Error: Could not list branches.")
    expect(report.stack).toContain("Caused by TypeError: fetch failed")
  })

  it("takes a thrown text as the message, with no stack", () => {
    expect(reportOf("Page /", "boom")).toStrictEqual({ source: "Page /", message: "boom", stack: null })
  })

  it("says the error had no message when something else was thrown", () => {
    expect(reportOf("Page /", { code: 7 }).message).toBe("The error had no message.")
  })
})

describe("toErrorEntry", () => {
  it("removes secrets and identity from the source, the message and the stack", () => {
    const entry = toErrorEntry(
      { source: "Page /Users/dana/web", message: "token ghp_abcdefghijklmnopqrstuvwxyz0123 for dana@example.com", stack: "at /Users/dana/app.js" },
      STAMP,
      FACTS,
    )

    expect(entry).toStrictEqual({
      kind: "error",
      ...STAMP,
      source: "Page ~/web",
      message: "token [redacted] for [email]",
      stack: "at ~/app.js",
      version: "0.1.9",
      platform: "darwin",
    })
  })

  it("cuts a very long message", () => {
    const entry = toErrorEntry({ source: "Page /", message: "x".repeat(MAX_MESSAGE_LENGTH + 10), stack: null }, STAMP, FACTS)

    expect(entry.message).toHaveLength(MAX_MESSAGE_LENGTH + "\n[cut]".length)
  })
})

describe("the error log", () => {
  it("records an error under a new log id and saves it", async () => {
    const { errorLog, storage } = createTestErrorLog()

    const logged = errorLog.record({ source: "tRPC review.get", message: "It broke.", stack: null })
    await logged.saving

    expect(logged.logId).toBe("20261023-142530-000001")
    await expect(storage.read(logged.logId)).resolves.toMatchObject({ kind: "error", message: "It broke." })
    expect(errorLog.folderPath).toBe(LOGS_FOLDER)
  })

  it("folds the same error from the same place into one log for 10 minutes", async () => {
    const { errorLog, storage, clock } = createTestErrorLog()
    const report = { source: "Forge github open", message: "No credential.", stack: null }

    const first = errorLog.record(report)
    clock.advance(REPEAT_WINDOW_MS - 1)
    const repeated = errorLog.record(report)
    clock.advance(1)
    const later = errorLog.record(report)
    await Promise.all([first.saving, repeated.saving, later.saving])

    expect(repeated.logId).toBe(first.logId)
    expect(later.logId).not.toBe(first.logId)
    await expect(storage.listIds()).resolves.toHaveLength(2)
  })

  it("logs a failure once, and knows its log id after", async () => {
    const { errorLog, storage } = createTestErrorLog()
    const failure = new Error("Forge refused.")

    const first = errorLog.recordFailure("Forge github viewer", failure)
    const second = errorLog.recordFailure("tRPC repository.list", failure)
    await Promise.all([first.saving, second.saving])

    expect(second.logId).toBe(first.logId)
    expect(errorLog.logIdOf(failure)).toBe(first.logId)
    expect(errorLog.logIdOf(new Error("Forge refused."))).toBeNull()
    await expect(storage.listIds()).resolves.toHaveLength(1)
  })

  it("saves a troubleshoot request with what the user wrote stripped of secrets", async () => {
    const { errorLog, storage } = createTestErrorLog()

    const request = await errorLog.saveRequest({
      description: "My token ghp_abcdefghijklmnopqrstuvwxyz0123 stopped working",
      shownError: "Could not reach github.com as dana",
      page: { path: "/Users/dana", title: PAGE.title },
      errorLogId: null,
      recentErrorLogIds: ["20261023-142000-000009"],
      agent: "Claude",
    })

    expect(request).toStrictEqual({
      kind: "request",
      id: "20261023-142530-000001",
      recordedAt: "2026-10-23T14:25:30.000Z",
      description: "My token [redacted] stopped working",
      shownError: "Could not reach github.com as [user]",
      page: { path: "~", title: "Agents" },
      errorLogId: null,
      recentErrorLogIds: ["20261023-142000-000009"],
      agent: "Claude",
      version: "0.1.9",
      platform: "darwin",
    })
    await expect(storage.read(request.id)).resolves.toStrictEqual(request)
  })

  it("removes the logs it is given", async () => {
    const { errorLog } = createTestErrorLog()
    const logged = errorLog.record({ source: "Page /", message: "Gone soon.", stack: null })
    await logged.saving

    await errorLog.remove([logged.logId])

    await expect(errorLog.read(logged.logId)).resolves.toBeNull()
  })
})
