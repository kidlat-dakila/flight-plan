import type { ArtifactMigration } from "@/procedures/migrate-review/utils/artifact-migration"
import { reviewVersionStateOf, writtenVersionOf } from "@/procedures/migrate-review/utils/review-version"

const migrationOf = (version: string): ArtifactMigration => ({ version, migrate: (stored) => stored })

const MIGRATIONS = [migrationOf("0.1.12"), migrationOf("0.2.0")]

describe("reviewVersionStateOf", () => {
  it("opens a Flight Plan saved after the newest migration, or older with no migration since", () => {
    expect(reviewVersionStateOf("0.2.0", "0.2.1", MIGRATIONS)).toStrictEqual({ kind: "current" })
    expect(reviewVersionStateOf("0.1.9", "0.1.11", [])).toStrictEqual({ kind: "current" })
    expect(reviewVersionStateOf(null, "0.1.11", [])).toStrictEqual({ kind: "current" })
  })

  it("holds back a Flight Plan saved before a migration, and one that names no version", () => {
    expect(reviewVersionStateOf("0.1.11", "0.2.0", MIGRATIONS)).toStrictEqual({ kind: "outdated", savedVersion: "0.1.11" })
    expect(reviewVersionStateOf(null, "0.2.0", MIGRATIONS)).toStrictEqual({ kind: "outdated", savedVersion: null })
  })

  it("holds back a Flight Plan saved by a newer Flight Plan, migrations or not", () => {
    expect(reviewVersionStateOf("0.3.0", "0.2.0", MIGRATIONS)).toStrictEqual({ kind: "newer", savedVersion: "0.3.0", runningVersion: "0.2.0" })
    expect(reviewVersionStateOf("0.1.12", "0.1.11", [])).toStrictEqual({ kind: "newer", savedVersion: "0.1.12", runningVersion: "0.1.11" })
  })

  it("never calls a Flight Plan newer in a build with no version", () => {
    expect(reviewVersionStateOf("9.0.0", null, [])).toStrictEqual({ kind: "current" })
  })
})

describe("writtenVersionOf", () => {
  it("writes the running version, the newest migration's in a build with no version, or none", () => {
    expect(writtenVersionOf("0.1.11", MIGRATIONS)).toBe("0.1.11")
    expect(writtenVersionOf(null, MIGRATIONS)).toBe("0.2.0")
    expect(writtenVersionOf(null, [])).toBeNull()
  })
})
