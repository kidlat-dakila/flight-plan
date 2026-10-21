import type { UpdateCheck } from "./schemas"

export interface UpdateCheckFile {
  readonly read: () => Promise<UpdateCheck | null>
  readonly write: (check: UpdateCheck) => Promise<void>
}

export type LatestVersionReader = () => Promise<string | null>

export interface UpdateChecker {
  readonly runningVersion: string
  readonly installPath: string
  readonly checkFile: UpdateCheckFile
  readonly readLatestVersion: LatestVersionReader
}
