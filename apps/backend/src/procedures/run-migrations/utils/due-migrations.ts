import { isNewerVersion } from "@/procedures/get-update-notice/utils/versions"

interface Versioned {
  readonly version: string
}

const byVersion = (left: Versioned, right: Versioned): number => {
  if (isNewerVersion(left.version, right.version)) return 1
  if (isNewerVersion(right.version, left.version)) return -1
  return 0
}

const isDue = (migration: Versioned, migratedVersion: string | null): boolean =>
  migratedVersion === null || isNewerVersion(migration.version, migratedVersion)

export const dueMigrationsOf = <Migration extends Versioned>(migrations: readonly Migration[], migratedVersion: string | null): readonly Migration[] =>
  migrations.filter((migration) => isDue(migration, migratedVersion)).sort(byVersion)
