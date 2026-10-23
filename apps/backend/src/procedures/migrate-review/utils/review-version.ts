import { isNewerVersion } from "@/procedures/get-update-notice/utils/versions"
import { dueMigrationsOf } from "@/procedures/run-migrations/utils/due-migrations"
import type { ArtifactMigration } from "./artifact-migration"

export type ReviewVersionState
  = | { readonly kind: "current" }
    | { readonly kind: "outdated", readonly savedVersion: string | null }
    | { readonly kind: "newer", readonly savedVersion: string, readonly runningVersion: string }

export type UnmigratedState = Exclude<ReviewVersionState, { readonly kind: "current" }>

export const CURRENT_REVIEW: ReviewVersionState = { kind: "current" }

export const reviewVersionStateOf = (
  savedVersion: string | null,
  runningVersion: string | null,
  migrations: readonly ArtifactMigration[],
): ReviewVersionState => {
  if (savedVersion !== null && runningVersion !== null && isNewerVersion(savedVersion, runningVersion)) {
    return { kind: "newer", savedVersion, runningVersion }
  }
  return dueMigrationsOf(migrations, savedVersion).length > 0 ? { kind: "outdated", savedVersion } : CURRENT_REVIEW
}

export const writtenVersionOf = (runningVersion: string | null, migrations: readonly ArtifactMigration[]): string | null =>
  runningVersion ?? dueMigrationsOf(migrations, null).at(-1)?.version ?? null
