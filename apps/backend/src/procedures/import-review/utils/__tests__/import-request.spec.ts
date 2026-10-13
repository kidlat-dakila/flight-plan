import { importIdOf, isImportUnderway, type ImportRequest } from "@/procedures/import-review/utils/import-request"

const REQUESTED_AT = new Date("2026-10-01T12:00:00.000Z")
const SOON_AFTER = new Date("2026-10-01T12:01:00.000Z")
const MUCH_LATER = new Date("2026-10-01T12:11:00.000Z")
const REQUEST: ImportRequest = { artifactUrl: "https://claude.ai/artifact/abc", channel: "agent", requestedAt: REQUESTED_AT, importedAt: null }

describe("isImportUnderway", () => {
  it("is underway while the agent Flight Plan started still runs", () => {
    expect(isImportUnderway(REQUEST, true, MUCH_LATER)).toBe(true)
    expect(isImportUnderway(REQUEST, false, SOON_AFTER)).toBe(false)
  })

  it("waits ten minutes for a session the reviewer started", () => {
    expect(isImportUnderway({ ...REQUEST, channel: "listener" }, false, SOON_AFTER)).toBe(true)
    expect(isImportUnderway({ ...REQUEST, channel: "listener" }, false, MUCH_LATER)).toBe(false)
  })

  it("is not underway with no request, or once the Flight Plan is stored", () => {
    expect(isImportUnderway(null, true, SOON_AFTER)).toBe(false)
    expect(isImportUnderway({ ...REQUEST, importedAt: SOON_AFTER }, true, SOON_AFTER)).toBe(false)
  })
})

describe("importIdOf", () => {
  it("names an import by when it was requested", () => {
    expect(importIdOf(REQUEST)).toBe("2026-10-01T12:00:00.000Z")
  })
})
