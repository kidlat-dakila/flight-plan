import { parseStored, parseStoredReview, parseStoredValue, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { dueMigrationsOf } from "@/procedures/run-migrations/utils/due-migrations"
import type { ArtifactMigration } from "./artifact-migration"
import { toCurrentShape } from "./current-shape"
import type { ReviewVersionState } from "./review-version"

const convertedReviewOf = (text: string): ReviewScaffold | null => {
  const converted = toCurrentShape(text)
  return converted === null ? null : parseStoredReview(converted)
}

const migratedReviewOf = (text: string, savedVersion: string | null, migrations: readonly ArtifactMigration[]): ReviewScaffold | null =>
  parseStoredValue(dueMigrationsOf(migrations, savedVersion).reduce((stored, migration) => migration.migrate(stored), parseStored(text)))

export const planReviewMigration = (text: string, state: ReviewVersionState, migrations: readonly ArtifactMigration[]): ReviewScaffold | null => {
  if (state.kind === "newer") return convertedReviewOf(text)
  if (state.kind === "outdated") return migratedReviewOf(text, state.savedVersion, migrations)
  return parseStoredReview(text)
}
