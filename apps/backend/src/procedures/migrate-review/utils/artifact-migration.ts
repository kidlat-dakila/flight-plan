export interface ArtifactMigration {
  readonly version: string
  readonly migrate: (stored: unknown) => unknown
}
