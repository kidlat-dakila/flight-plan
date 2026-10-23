import { createTestErrorLog } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import { recordAdapterFailures, recordingAdapterOpener } from "@/utils/adapter-failure-recorder"
import { GitAdapterError, type Capability, type GitAdapter, type GitAdapterInput, type Resolved } from "@flightplan/git-forge"

const INPUT: GitAdapterInput = { id: "github", root: "/repo", secret: "s3cr3t", username: "", baseUrl: "" }

const refuse = async (): Promise<never> => await Promise.reject(new Error("The test does not read this."))

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["history"])

const createAdapter = (): GitAdapter => ({
  id: "github",
  name: "GitHub",
  repo: "acme/web",
  capabilities: CAPABILITIES,
  supports: (capability) => CAPABILITIES.has(capability),
  reviewFilters: () => [],
  listTargets: refuse,
  target: refuse,
  listLabels: refuse,
  reviewers: refuse,
  headSha: refuse,
  baseSha: refuse,
  diff: refuse,
  compare: refuse,
  blob: refuse,
  blobs: refuse,
  listFiles: refuse,
  searchFiles: refuse,
  permalink: () => "",
  viewer: async () => await Promise.reject(new GitAdapterError("Bad credentials.", "auth")),
  searchPeople: refuse,
  reviewVerdicts: () => [],
  discussion: refuse,
  submitReview: refuse,
  addComment: refuse,
  replyToThread: refuse,
  resolveThread: refuse,
  reopenThread: refuse,
  searchReviewers: refuse,
  requestReviewers: refuse,
  removeReviewRequests: refuse,
  listPullRequests: refuse,
  listRecentPullRequests: refuse,
  listBranches: async () => await Promise.resolve([]),
  branchStart: refuse,
  fetchRemotes: refuse,
})

const gitAdapterOf = (resolved: Resolved): GitAdapter => {
  if (!resolved.ok) throw new Error("The adapter should open.")
  return resolved.gitAdapter
}

describe("recordAdapterFailures", () => {
  it("logs a forge call that fails and still fails it", async () => {
    const { errorLog, storage } = createTestErrorLog()
    const adapter = recordAdapterFailures(createAdapter(), errorLog)

    await expect(adapter.viewer()).rejects.toThrow("Bad credentials.")
    await Promise.resolve()

    const [logId] = await storage.listIds()
    await expect(storage.read(logId)).resolves.toMatchObject({ source: "Forge github viewer", message: "Bad credentials." })
  })

  it("answers calls that succeed as the adapter does, and logs nothing", async () => {
    const { errorLog, storage } = createTestErrorLog()
    const adapter = recordAdapterFailures(createAdapter(), errorLog)

    await expect(adapter.listBranches()).resolves.toStrictEqual([])
    expect(adapter.supports("history")).toBe(true)
    expect(adapter.name).toBe("GitHub")
    await expect(storage.listIds()).resolves.toStrictEqual([])
  })
})

describe("recordingAdapterOpener", () => {
  it("logs an adapter that cannot be opened", async () => {
    const { errorLog, storage } = createTestErrorLog()
    const refused: Resolved = { ok: false, error: new GitAdapterError("No GitHub token.", "auth"), repo: "" }

    const opened = await recordingAdapterOpener(async () => await Promise.resolve(refused), errorLog)(INPUT)
    await Promise.resolve()

    expect(opened).toBe(refused)
    const [logId] = await storage.listIds()
    await expect(storage.read(logId)).resolves.toMatchObject({ source: "Forge github open", message: "No GitHub token." })
  })

  it("hands back an opened adapter that logs its failures", async () => {
    const { errorLog, storage } = createTestErrorLog()
    const resolved: Resolved = { ok: true, gitAdapter: createAdapter(), repo: "acme/web" }

    const opened = await recordingAdapterOpener(async () => await Promise.resolve(resolved), errorLog)(INPUT)
    await expect(gitAdapterOf(opened).viewer()).rejects.toThrow("Bad credentials.")
    await Promise.resolve()

    await expect(storage.listIds()).resolves.toHaveLength(1)
  })
})
