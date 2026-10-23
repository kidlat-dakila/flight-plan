import { isNewerVersion } from "@/procedures/get-update-notice/utils/versions"
import type { Migration } from "./migration"

const byVersion = (left: Migration, right: Migration): number => {
  if (isNewerVersion(left.version, right.version)) return 1
  if (isNewerVersion(right.version, left.version)) return -1
  return 0
}

const isDue = (migration: Migration, migratedVersion: string | null): boolean =>
  migratedVersion === null || isNewerVersion(migration.version, migratedVersion)

export const dueMigrationsOf = (migrations: readonly Migration[], migratedVersion: string | null): readonly Migration[] =>
  migrations.filter((migration) => isDue(migration, migratedVersion)).sort(byVersion)
