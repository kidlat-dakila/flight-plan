import type { ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { GitAdapterInput, Resolved } from "@/utils/git-adapter/helpers/assemble"
import type { Remote } from "@/utils/git-adapter/helpers/remote"
import { GitAdapterError } from "@/utils/git-adapter/types"
import { createRepositoryAdapterOpener, problemOf } from "@/utils/repository-adapter-opener"

const REMOTE: Remote = { host: "gitlab.acme.test", owner: "platform", name: "ledger", fullName: "platform/ledger" }
const UNREADABLE: Resolved = { ok: false, repo: "", error: new GitAdapterError("no token", "auth") }

const forgesOf = (...forges: readonly SetupForge[]): ForgesChoice => ({
  connections: forges.map((forge) => ({ forge, username: "dev", baseUrl: forge === "gitlab" ? "https://gitlab.acme.test" : "", hasCredential: true })),
  defaultForge: forges[0] ?? "git",
})

const opener = (remote: Remote | null = REMOTE) => {
  const openAdapter = vi.fn<(input: GitAdapterInput) => Promise<Resolved>>(async () => await Promise.resolve(UNREADABLE))
  const readCredential = vi.fn<(forge: SetupForge) => Promise<string | null>>(async () => await Promise.resolve("secret-token"))
  return {
    open: createRepositoryAdapterOpener({
      readRemote: async () => await Promise.resolve(remote),
      openAdapter,
      readCredential,
      environment: { PATH: "/usr/bin" },
    }),
    opened: () => openAdapter.mock.calls.map(([input]) => input),
    credentialLookups: () => readCredential.mock.calls.map(([forge]) => forge),
  }
}

describe("createRepositoryAdapterOpener", () => {
  it("opens plain git when no forge is set up", async () => {
    const { open, opened, credentialLookups } = opener()

    const repository = await open("/work/ledger", null)

    expect(repository).toMatchObject({ forge: "git", adapterName: "git", forgeSlug: "platform/ledger", resolved: UNREADABLE })
    expect(opened()).toStrictEqual([
      { id: "git", root: "/work/ledger", secret: null, username: "", baseUrl: "", environment: { PATH: "/usr/bin" } },
    ])
    expect(credentialLookups()).toStrictEqual([])
  })

  it("opens the connection that serves the remote's host, with its token", async () => {
    const { open, opened, credentialLookups } = opener()

    const repository = await open("/work/ledger", forgesOf("gh", "gitlab"))

    expect(repository).toMatchObject({ forge: "gitlab", adapterName: "gitlab" })
    expect(opened()[0]).toMatchObject({ id: "gitlab", secret: "secret-token", username: "dev", baseUrl: "https://gitlab.acme.test" })
    expect(credentialLookups()).toStrictEqual(["gitlab"])
  })

  it.each(["gh", "glab"] as const)("opens the %s command line tool without reading a token", async (forge) => {
    const { open, opened, credentialLookups } = opener()

    await open("/work/ledger", forgesOf(forge))

    expect(opened()[0]).toMatchObject({ id: forge, secret: null })
    expect(credentialLookups()).toStrictEqual([])
  })

  it("names no slug for a folder without a remote", async () => {
    await expect(opener(null).open("/work/ledger", null)).resolves.toMatchObject({ forgeSlug: null })
  })
})

describe("problemOf", () => {
  it("names the problem of an adapter error, and any other failure unknown", () => {
    expect(problemOf(new GitAdapterError("offline", "network"))).toBe("network")
    expect(problemOf(new Error("boom"))).toBe("unknown")
  })
})
