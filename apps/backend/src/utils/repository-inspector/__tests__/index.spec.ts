import { adapterWith } from "@/__tests__/adapter-stub"
import type { ForgesChoice } from "@/procedures/get-setup/utils/setup"
import { RepositoryInspector, type InspectionRequest, type InspectorDependencies } from "@/utils/repository-inspector"
import { type Resolved, type Remote,
  GitAdapterError,
  type BranchTip,
  type GitAdapter,
  type PullRequestHistory } from "@flightplan/git-forge"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const MINUTE_MS = 60_000

const resolveNothing = async (): Promise<void> => {
  await Promise.resolve()
}

const rejectOffline = async (): Promise<void> => {
  await Promise.reject(new Error("offline"))
}

const history = (number: number, login: string): PullRequestHistory => ({
  number,
  title: `Pull request ${String(number)}`,
  headBranch: `feature/${String(number)}`,
  state: "open",
  isDraft: false,
  author: { login, avatarUrl: "" },
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  requestedReviewers: [],
  discussion: [],
  commitDates: [],
})

const tip = (name: string, authorEmail: string): BranchTip => ({ name, sha: `sha-${name}`, authorEmail, updatedAt: "2026-10-01T09:00:00.000Z" })

const GITHUB_REMOTE: Remote = { host: "github.com", owner: "acme", name: "storefront", fullName: "acme/storefront" }

interface Harness {
  readonly inspector: RepositoryInspector
  readonly opened: () => Parameters<InspectorDependencies["openAdapter"]>[0][]
  readonly credentialLookups: () => string[]
  readonly setNow: (now: Date) => void
}

const harness = (resolved: Resolved, remote: Remote | null = GITHUB_REMOTE): Harness => {
  const openAdapter = vi.fn<InspectorDependencies["openAdapter"]>(async () => await Promise.resolve(resolved))
  const readCredential = vi.fn<InspectorDependencies["readCredential"]>(async () => await Promise.resolve("secret-token"))
  const now = vi.fn<() => Date>(() => NOW)
  const inspector = new RepositoryInspector({
    readRemote: async () => await Promise.resolve(remote),
    openAdapter,
    readCredential,
    environment: { PATH: "/usr/bin" },
    now,
  })
  return {
    inspector,
    opened: () => openAdapter.mock.calls.map(([input]) => input),
    credentialLookups: () => readCredential.mock.calls.map(([forge]) => forge),
    setNow: (date) => {
      now.mockReturnValue(date)
    },
  }
}

const ready = (gitAdapter: GitAdapter): Resolved => ({ ok: true, gitAdapter, repo: gitAdapter.repo })

const forgesWith = (defaultForge: ForgesChoice["defaultForge"]): ForgesChoice => ({
  connections: [{ forge: defaultForge, username: "dev", baseUrl: "", hasCredential: true }],
  defaultForge,
})

const request = (overrides: Partial<InspectionRequest> = {}): InspectionRequest => ({
  path: "/work/storefront",
  forges: null,
  trackedAuthorIds: [],
  selfAuthorId: null,
  addedBranchNames: [],
  addedPullRequestAuthors: [],
  ...overrides,
})

describe("RepositoryInspector on local git", () => {
  const branchAdapter = (fetchRemotes = vi.fn(resolveNothing)): GitAdapter =>
    adapterWith("git", {
      listBranches: async () => await Promise.resolve([tip("mine", "dev@acme.test"), tip("theirs", "mira@acme.test"), tip("other", "x@acme.test")]),
      branchStart: async (name) => await Promise.resolve(name === "mine" ? "2026-09-30T08:00:00.000Z" : null),
      fetchRemotes,
    })

  it("lists the branches of the tracked authors and of the user, with where each began", async () => {
    const { inspector } = harness(ready(branchAdapter()))

    const inspection = await inspector.inspect(request({ trackedAuthorIds: ["mira@acme.test"], selfAuthorId: "dev@acme.test" }))

    expect(inspection).toStrictEqual({
      forge: "git",
      forgeSlug: "acme/storefront",
      problem: null,
      snapshot: null,
      branches: [
        {
          name: "mine",
          tipDate: new Date("2026-10-01T09:00:00.000Z"),
          startedAt: new Date("2026-09-30T08:00:00.000Z"),
        },
        {
          name: "theirs",
          tipDate: new Date("2026-10-01T09:00:00.000Z"),
          startedAt: new Date("2026-10-01T09:00:00.000Z"),
        },
      ],
    })
  })

  it("lists no branches while nobody is tracked", async () => {
    const { inspector } = harness(ready(branchAdapter()))

    await expect(inspector.inspect(request())).resolves.toMatchObject({ problem: null, branches: [] })
  })

  it("lists an added branch of an author nobody tracks", async () => {
    const { inspector } = harness(ready(branchAdapter()))

    await expect(inspector.inspect(request({ addedBranchNames: ["other"] }))).resolves.toMatchObject({
      branches: [{ name: "other" }],
    })
  })

  it("names no slug for a repository without a remote", async () => {
    const { inspector } = harness(ready(branchAdapter()), null)

    await expect(inspector.inspect(request())).resolves.toMatchObject({ forgeSlug: null })
  })

  it("fetches in the background once per interval", async () => {
    const fetchRemotes = vi.fn(resolveNothing)
    const { inspector, setNow } = harness(ready(branchAdapter(fetchRemotes)))

    await inspector.inspect(request())
    await inspector.inspect(request())
    expect(fetchRemotes).toHaveBeenCalledTimes(1)

    setNow(new Date(NOW.getTime() + 6 * MINUTE_MS))
    await inspector.inspect(request())
    expect(fetchRemotes).toHaveBeenCalledTimes(2)
  })

  it("lists the local branches even when the fetch fails", async () => {
    const { inspector } = harness(ready(branchAdapter(vi.fn(rejectOffline))))

    await expect(inspector.inspect(request({ selfAuthorId: "dev@acme.test" }))).resolves.toMatchObject({ problem: null })
  })

  it("reports the problem when the branches cannot be read", async () => {
    const failing = adapterWith("git", {
      listBranches: async () => await Promise.reject(new GitAdapterError("git is not installed here.", "no-cli")),
      fetchRemotes: async () => { await Promise.resolve() },
    })
    const { inspector } = harness(ready(failing))

    await expect(inspector.inspect(request())).resolves.toMatchObject({ problem: "no-cli", branches: [] })
  })

  it("does not look up a credential", async () => {
    const { inspector, credentialLookups } = harness(ready(branchAdapter()))

    await inspector.inspect(request())

    expect(credentialLookups()).toStrictEqual([])
  })
})

describe("RepositoryInspector on a forge", () => {
  const forgeAdapter = (listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))): GitAdapter =>
    adapterWith("github", { viewer: async () => await Promise.resolve({ login: "dev", avatarUrl: "" }), listPullRequests })

  it("reads the pull requests of the user and of the tracked authors", async () => {
    const listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))
    const { inspector } = harness(ready(forgeAdapter(listPullRequests)))

    const inspection = await inspector.inspect(request({ forges: forgesWith("github"), trackedAuthorIds: ["@mira"] }))

    expect(listPullRequests).toHaveBeenCalledWith({ authors: ["dev", "@mira"], limit: 15 })
    expect(inspection).toMatchObject({
      forge: "github",
      forgeSlug: "acme/storefront",
      problem: null,
      branches: [],
      snapshot: { viewerLogin: "dev", pullRequests: [{ number: 1, author: { login: "mira" } }] },
    })
  })

  it("reads the pull requests of the authors of added pull requests, and the added branches", async () => {
    const listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))
    const adapter = adapterWith("github", {
      viewer: async () => await Promise.resolve({ login: "dev", avatarUrl: "" }),
      listPullRequests,
      listBranches: async () => await Promise.resolve([tip("spike/returns", "x@acme.test"), tip("other", "x@acme.test")]),
    })
    const { inspector } = harness(ready(adapter))

    const inspection = await inspector.inspect(request({
      forges: forgesWith("github"),
      trackedAuthorIds: ["@mira"],
      addedBranchNames: ["spike/returns"],
      addedPullRequestAuthors: ["jonas", "dev"],
    }))

    expect(listPullRequests).toHaveBeenCalledWith({ authors: ["dev", "@mira", "jonas"], limit: 15 })
    expect(inspection.branches).toStrictEqual([
      { name: "spike/returns", tipDate: new Date("2026-10-01T09:00:00.000Z"), startedAt: new Date("2026-10-01T09:00:00.000Z") },
    ])
  })

  it("lists no added branch of a forge when the branches cannot be read", async () => {
    const adapter = adapterWith("github", {
      viewer: async () => await Promise.resolve({ login: "dev", avatarUrl: "" }),
      listPullRequests: async () => await Promise.resolve([]),
      listBranches: async () => await Promise.reject(new GitAdapterError("git is not installed here.", "no-cli")),
    })
    const { inspector } = harness(ready(adapter))

    await expect(inspector.inspect(request({ forges: forgesWith("github"), addedBranchNames: ["spike/returns"] }))).resolves.toMatchObject({
      problem: null,
      branches: [],
    })
  })

  it("opens the adapter for the forge with its credential and the environment", async () => {
    const { inspector, opened } = harness(ready(forgeAdapter()))

    await inspector.inspect(request({ forges: { connections: [{ forge: "github", username: "dev", baseUrl: "https://ghe.acme.test", hasCredential: true }], defaultForge: "github" } }))

    expect(opened()).toStrictEqual([
      { id: "github", root: "/work/storefront", secret: "secret-token", username: "dev", baseUrl: "https://ghe.acme.test", environment: { PATH: "/usr/bin" } },
    ])
  })

  it("asks no credential of the GitHub CLI", async () => {
    const { inspector, credentialLookups, opened } = harness(ready(forgeAdapter()))

    await inspector.inspect(request({ forges: forgesWith("gh") }))

    expect(credentialLookups()).toStrictEqual([])
    expect(opened()[0]).toMatchObject({ id: "gh", secret: null })
  })

  it("serves the GitLab CLI choice with the glab adapter, without reading a token", async () => {
    const { inspector, opened } = harness(ready(forgeAdapter()), { host: "gitlab.com", owner: "acme", name: "ledger", fullName: "acme/ledger" })

    await inspector.inspect(request({ forges: forgesWith("glab") }))

    expect(opened()[0]).toMatchObject({ id: "glab", secret: null })
  })

  it("reads the forge once within the cache window and again after it", async () => {
    const listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))
    const { inspector, setNow } = harness(ready(forgeAdapter(listPullRequests)))
    const forgeRequest = request({ forges: forgesWith("github") })

    await inspector.inspect(forgeRequest)
    await inspector.inspect(forgeRequest)
    expect(listPullRequests).toHaveBeenCalledTimes(1)

    setNow(new Date(NOW.getTime() + 3 * MINUTE_MS))
    await inspector.inspect(forgeRequest)
    expect(listPullRequests).toHaveBeenCalledTimes(2)
  })

  it("reads the forge again within the cache window once the repository is forgotten", async () => {
    const listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))
    const { inspector } = harness(ready(forgeAdapter(listPullRequests)))
    const forgeRequest = request({ forges: forgesWith("github") })

    await inspector.inspect(forgeRequest)
    inspector.forget("/work/elsewhere")
    await inspector.inspect(forgeRequest)
    expect(listPullRequests).toHaveBeenCalledTimes(1)

    inspector.forget(forgeRequest.path)
    await inspector.inspect(forgeRequest)
    expect(listPullRequests).toHaveBeenCalledTimes(2)
  })

  it("reads the forge again when the tracked authors change", async () => {
    const listPullRequests = vi.fn(async () => await Promise.resolve([history(1, "mira")]))
    const { inspector } = harness(ready(forgeAdapter(listPullRequests)))

    await inspector.inspect(request({ forges: forgesWith("github"), trackedAuthorIds: ["mira"] }))
    await inspector.inspect(request({ forges: forgesWith("github"), trackedAuthorIds: ["mira", "teo"] }))

    expect(listPullRequests).toHaveBeenCalledTimes(2)
  })

  it("reports the problem the adapter could not be opened with", async () => {
    const { inspector } = harness({ ok: false, error: new GitAdapterError("no token", "auth"), repo: "acme/storefront" })

    await expect(inspector.inspect(request({ forges: forgesWith("github") }))).resolves.toStrictEqual({
      forge: "github",
      forgeSlug: "acme/storefront",
      problem: "auth",
      snapshot: null,
      branches: [],
    })
  })

  it("reports the problem a read failed with", async () => {
    const failing = vi.fn(async () => await Promise.reject(new GitAdapterError("rate limited", "network")))
    const { inspector } = harness(ready(forgeAdapter(failing)))

    await expect(inspector.inspect(request({ forges: forgesWith("github") }))).resolves.toMatchObject({ problem: "network", snapshot: null })
  })

  it("reports an unknown problem for a failure that is not the adapter's", async () => {
    const failing = vi.fn(async () => await Promise.reject(new Error("boom")))
    const { inspector } = harness(ready(forgeAdapter(failing)))

    await expect(inspector.inspect(request({ forges: forgesWith("github") }))).resolves.toMatchObject({ problem: "unknown" })
  })

  it("reports unsupported for an adapter that cannot read history", async () => {
    const { inspector } = harness(ready({ ...forgeAdapter(), supports: () => false }))

    await expect(inspector.inspect(request({ forges: forgesWith("github") }))).resolves.toMatchObject({ problem: "unsupported" })
  })
})
