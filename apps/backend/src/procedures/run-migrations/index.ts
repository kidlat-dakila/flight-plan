import type { ProcedureContext } from "@/procedures/context"
import { dueMigrationsOf } from "./utils/due-migrations"
import type { InitFile, Migration } from "./utils/migration"
import { MIGRATIONS } from "./utils/migrations"

export const runMigrations = async (
  context: ProcedureContext,
  initFile: InitFile,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<void> => {
  const record = await initFile.read()
  const dueMigrations = dueMigrationsOf(migrations, record?.migratedVersion ?? null)
  await dueMigrations.reduce(async (earlierMigrations, migration) => {
    await earlierMigrations
    await migration.migrate(context)
    await initFile.write({ migratedVersion: migration.version })
  }, Promise.resolve())
}
