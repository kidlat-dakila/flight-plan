import { createMockProcedureContext } from "@/procedures/context"
import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { runMigrations } from "@/procedures/run-migrations"
import type { InitFile, Migration } from "@/procedures/run-migrations/utils/migration"
import type { InitRecord } from "@/procedures/run-migrations/utils/schemas"

interface RecordingInitFile extends InitFile {
  readonly write: ReturnType<typeof vi.fn<InitFile["write"]>>
}

const createRecordingInitFile = (stored: InitRecord | null): RecordingInitFile => ({
  read: async () => await Promise.resolve(stored),
  write: vi.fn<InitFile["write"]>(),
})

const migrationOf = (version: string, migrate: Migration["migrate"]): Migration => ({ version, migrate })

const CONTEXT = createMockProcedureContext(new Date("2026-10-23T12:00:00.000Z"))

describe("runMigrations", () => {
  it("runs every migration, oldest first, and records each version when init.json is missing", async () => {
    const recordRun = vi.fn<(version: string) => void>()
    const initFile = createRecordingInitFile(null)
    const runOf = (version: string): Migration["migrate"] => async () => {
      recordRun(version)
      await Promise.resolve()
    }

    await runMigrations(CONTEXT, initFile, [migrationOf("0.2.0", runOf("0.2.0")), migrationOf("0.1.10", runOf("0.1.10"))])

    expect(recordRun.mock.calls).toStrictEqual([["0.1.10"], ["0.2.0"]])
    expect(initFile.write.mock.calls).toStrictEqual([[{ migratedVersion: "0.1.10" }], [{ migratedVersion: "0.2.0" }]])
  })

  it("does nothing when the newest migration ran last", async () => {
    const migrate = vi.fn<Migration["migrate"]>()
    const initFile = createRecordingInitFile({ migratedVersion: "0.1.10" })

    await runMigrations(CONTEXT, initFile, [migrationOf("0.1.10", migrate)])

    expect(migrate).not.toHaveBeenCalled()
    expect(initFile.write).not.toHaveBeenCalled()
  })

  it("stops at a failing migration and keeps the version of the last one that ran", async () => {
    const later = vi.fn<Migration["migrate"]>()
    const initFile = createRecordingInitFile(null)
    const migrations = [
      migrationOf("0.1.10", vi.fn<Migration["migrate"]>()),
      migrationOf("0.2.0", vi.fn<Migration["migrate"]>().mockRejectedValue(new Error("Settings could not be written."))),
      migrationOf("0.3.0", later),
    ]

    await expect(runMigrations(CONTEXT, initFile, migrations)).rejects.toThrow("Settings could not be written.")
    expect(later).not.toHaveBeenCalled()
    expect(initFile.write.mock.calls).toStrictEqual([[{ migratedVersion: "0.1.10" }]])
  })

  it("turns segments off and puts the Blast Diagram last in the saved preferences at 0.1.11", async () => {
    const reviewPreferences = { ...DEFAULT_REVIEW_PREFERENCES, isSegmented: true, sectionOrder: ["context", "traceDiagram", "blastDiagram", "walkthrough"] as const }
    const setupStore = new InMemorySetupStore({ ...EMPTY_SETUP, reviewPreferences })

    await runMigrations({ ...CONTEXT, setupStore }, createRecordingInitFile({ migratedVersion: "0.1.10" }))

    await expect(setupStore.read()).resolves.toMatchObject({
      reviewPreferences: { isSegmented: false, sectionOrder: ["context", "traceDiagram", "walkthrough", "blastDiagram"] },
    })
  })
})
