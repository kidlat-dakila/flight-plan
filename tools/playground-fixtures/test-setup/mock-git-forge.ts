import { afterEach, vi } from "vitest"
import type * as GitForge from "@flightplan/git-forge"
import { assembleGitAdapter, readRemote, repoName } from "@flightplan/git-forge"

const { refuse } = vi.hoisted(() => ({
  refuse: async (): Promise<never> =>
    await Promise.reject(new Error("Call setupTest({ repoPath, diffs }) before the code under test reads a repository.")),
}))

vi.mock("@flightplan/git-forge", async (importOriginal) => ({
  ...(await importOriginal<typeof GitForge>()),
  assembleGitAdapter: vi.fn(refuse),
  readRemote: vi.fn(refuse),
  repoName: vi.fn(refuse),
}))

afterEach(() => {
  vi.mocked(assembleGitAdapter).mockReset()
  vi.mocked(readRemote).mockReset()
  vi.mocked(repoName).mockReset()
})
