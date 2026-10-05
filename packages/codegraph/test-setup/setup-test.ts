import { vi } from "vitest"
import { assembleGitAdapter, readRemote, repoName } from "@flightplan/git-forge"
import { CASE_REMOTE, createCaseAdapter } from "./case-adapter"
import { readRepositoryFiles } from "./repository-files"

export interface TestSetup {
  readonly repoPath: string
  readonly diffs: readonly string[]
}

export const setupTest = ({ repoPath, diffs }: TestSetup): void => {
  const baseFiles = readRepositoryFiles(repoPath)
  const gitAdapter = createCaseAdapter({ readBaseFiles: async () => await baseFiles, diffs })
  vi.mocked(assembleGitAdapter).mockResolvedValue({ ok: true, gitAdapter, repo: CASE_REMOTE.fullName })
  vi.mocked(readRemote).mockResolvedValue(CASE_REMOTE)
  vi.mocked(repoName).mockResolvedValue(CASE_REMOTE.name)
}
