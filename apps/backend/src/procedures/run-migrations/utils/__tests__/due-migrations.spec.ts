import { dueMigrationsOf } from "@/procedures/run-migrations/utils/due-migrations"
import type { Migration } from "@/procedures/run-migrations/utils/migration"

const migrationOf = (version: string): Migration => ({ version, migrate: vi.fn<Migration["migrate"]>() })

const MIGRATIONS = [migrationOf("0.1.10"), migrationOf("0.1.9"), migrationOf("0.2.0")]

const versionsOf = (migrations: readonly Migration[]): readonly string[] => migrations.map((migration) => migration.version)

describe("dueMigrationsOf", () => {
  it("takes every migration, oldest first, when none has run", () => {
    expect(versionsOf(dueMigrationsOf(MIGRATIONS, null))).toStrictEqual(["0.1.9", "0.1.10", "0.2.0"])
  })

  it("takes only the migrations newer than the one that ran last", () => {
    expect(versionsOf(dueMigrationsOf(MIGRATIONS, "0.1.9"))).toStrictEqual(["0.1.10", "0.2.0"])
  })

  it("takes none when the newest migration ran last", () => {
    expect(dueMigrationsOf(MIGRATIONS, "0.2.0")).toStrictEqual([])
  })
})
