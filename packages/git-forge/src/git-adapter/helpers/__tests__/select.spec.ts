import * as assert from "node:assert"
import {
  CLOUD_HOSTS,
  expectedHost,
  hostOfBaseUrl,
  selectGitAdapter,
} from "@/git-adapter/helpers/select"
import { GitAdapterError, type GitAdapterId } from "@/git-adapter/types"

suite("reading a configured base URL", () => {
  it("an empty setting means the cloud host", () => {
    assert.strictEqual(hostOfBaseUrl(""), null)
    assert.strictEqual(hostOfBaseUrl("   "), null)
    assert.strictEqual(expectedHost("gitlab", ""), "gitlab.com")
    assert.strictEqual(expectedHost("bitbucket", ""), "bitbucket.org")
    assert.strictEqual(expectedHost("github", ""), "github.com")
  })

  it("a base URL overrides the cloud host", () => {
    assert.strictEqual(
      expectedHost("gitlab", "https://gitlab.example.com"),
      "gitlab.example.com",
    )
  })

  it("a path, a port or a missing scheme still yields the host", () => {
    assert.strictEqual(hostOfBaseUrl("https://gitlab.example.com/api/v4"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("gitlab.example.com"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("https://gitlab.example.com:8443/"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("HTTPS://GitLab.Example.COM"), "gitlab.example.com")
  })

  it("something unparseable is treated as unset rather than thrown", () => {
    assert.strictEqual(hostOfBaseUrl("http://"), null)
  })

  it("git claims no host at all, which is why it works everywhere", () => {
    assert.strictEqual(CLOUD_HOSTS.git, null)
    assert.strictEqual(expectedHost("git", ""), null)
  })
})

suite("choosing which adapter answers for a checkout", () => {
  it("git accepts any remote, including none", () => {
    for (const remoteHost of ["github.com", "gitlab.example.com", null]) {
      assert.deepStrictEqual(
        selectGitAdapter({ id: "git", remoteHost, baseUrl: "", hasCredential: false }),
        { ok: true },
      )
    }
  })

  it("a matching cloud host is accepted", () => {
    const pairs: [GitAdapterId, string][] = [
      ["gh", "github.com"],
      ["github", "github.com"],
      ["gitlab", "gitlab.com"],
      ["bitbucket", "bitbucket.org"],
    ]
    for (const [id, remoteHost] of pairs) {
      assert.deepStrictEqual(
        selectGitAdapter({ id, remoteHost, baseUrl: "", hasCredential: true }),
        { ok: true },
        `${id} should accept ${remoteHost}`,
      )
    }
  })

  it("host comparison ignores case", () => {
    assert.ok(
      selectGitAdapter({
        id: "github",
        remoteHost: "GitHub.com",
        baseUrl: "",
        hasCredential: true,
      }).ok,
    )
  })

  it("a remote on another host is refused, naming both", () => {
    const selection = selectGitAdapter({
      id: "gitlab",
      remoteHost: "github.com",
      baseUrl: "",
      hasCredential: true,
    })
    assert.strictEqual(selection.ok, false)
    assert.ok(selection.error instanceof GitAdapterError)
    assert.strictEqual(selection.error.problem, "host-mismatch")
    assert.strictEqual(
      selection.error.message,
      "This repository is on github.com, and Flight Plan is set up to use GitLab on gitlab.com. Change it in Flight Plan's setup, or open a repository on gitlab.com.",
    )
  })

  it("a self-hosted instance is accepted once its base URL is set", () => {
    const options = {
      id: "gitlab" as const,
      remoteHost: "gitlab.example.com",
      hasCredential: true,
    }

    assert.strictEqual(selectGitAdapter({ ...options, baseUrl: "" }).ok, false)
    assert.strictEqual(
      selectGitAdapter({ ...options, baseUrl: "https://gitlab.example.com" }).ok,
      true,
    )
  })

  it("no remote at all is a no-repo problem, not a host mismatch", () => {
    const selection = selectGitAdapter({
      id: "github",
      remoteHost: null,
      baseUrl: "",
      hasCredential: true,
    })
    assert.strictEqual(selection.ok ? "ok" : selection.error.problem, "no-repo")
  })

  it("a adapter that needs a token and has none says so", () => {
    for (const id of ["github", "gitlab", "bitbucket"] as const) {
      const selection = selectGitAdapter({
        id,
        remoteHost: CLOUD_HOSTS[id],
        baseUrl: "",
        hasCredential: false,
      })
      assert.strictEqual(selection.ok ? "ok" : selection.error.problem, "auth", `${id} should want a credential`)
    }
  })

  it("the CLI is not asked for a token we never store", () => {
    assert.deepStrictEqual(
      selectGitAdapter({
        id: "gh",
        remoteHost: "github.com",
        baseUrl: "",
        hasCredential: false,
      }),
      { ok: true },
    )
  })

  it("a mismatched host outranks a missing token, because it is the real problem", () => {
    const selection = selectGitAdapter({
      id: "gitlab",
      remoteHost: "github.com",
      baseUrl: "",
      hasCredential: false,
    })
    assert.strictEqual(!selection.ok && selection.error.problem, "host-mismatch")
  })
})
