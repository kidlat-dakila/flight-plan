import * as assert from "assert"
import {
  CLOUD_HOSTS,
  expectedHost,
  hostOfBaseUrl,
  selectGitAdapter,
} from "../select"
import { GitAdapterError, type GitAdapterId } from "../../../../lib/git-adapter/types"

suite("reading a configured base URL", () => {
  test("an empty setting means the cloud host", () => {
    assert.strictEqual(hostOfBaseUrl(""), null)
    assert.strictEqual(hostOfBaseUrl("   "), null)
    assert.strictEqual(expectedHost("gitlab", ""), "gitlab.com")
    assert.strictEqual(expectedHost("bitbucket", ""), "bitbucket.org")
    assert.strictEqual(expectedHost("github", ""), "github.com")
  })

  test("a base URL overrides the cloud host", () => {
    assert.strictEqual(
      expectedHost("gitlab", "https://gitlab.example.com"),
      "gitlab.example.com",
    )
  })

  /*
   * People paste what is in their address bar, which has a path on it, and
   * people also type a bare hostname. Both have to reduce to a host, because
   * the alternative is a host comparison that fails against the instance the
   * reader just configured.
   */
  test("a path, a port or a missing scheme still yields the host", () => {
    assert.strictEqual(hostOfBaseUrl("https://gitlab.example.com/api/v4"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("gitlab.example.com"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("https://gitlab.example.com:8443/"), "gitlab.example.com")
    assert.strictEqual(hostOfBaseUrl("HTTPS://GitLab.Example.COM"), "gitlab.example.com")
  })

  test("something unparseable is treated as unset rather than thrown", () => {
    assert.strictEqual(hostOfBaseUrl("http://"), null)
  })

  test("git claims no host at all, which is why it works everywhere", () => {
    assert.strictEqual(CLOUD_HOSTS.git, null)
    assert.strictEqual(expectedHost("git", ""), null)
  })
})

suite("choosing which adapter answers for a checkout", () => {
  /*
   * git is the floor. It reads the checkout and asks no host anything, so any
   * remote — or none — is fine, and it never wants a credential.
   */
  test("git accepts any remote, including none", () => {
    for (const remoteHost of ["github.com", "gitlab.example.com", null]) {
      assert.deepStrictEqual(
        selectGitAdapter({ id: "git", remoteHost, baseUrl: "", hasCredential: false }),
        { ok: true },
      )
    }
  })

  test("a matching cloud host is accepted", () => {
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

  test("host comparison ignores case", () => {
    assert.ok(
      selectGitAdapter({
        id: "github",
        remoteHost: "GitHub.com",
        baseUrl: "",
        hasCredential: true,
      }).ok,
    )
  })

  /*
   * The failure this whole module exists for. Without it, a GitLab token
   * against a github.com remote produces a wall of 404s from a host that has
   * never heard of the project, and nothing anywhere says why.
   */
  test("a remote on another host is refused, naming both", () => {
    const selection = selectGitAdapter({
      id: "gitlab",
      remoteHost: "github.com",
      baseUrl: "",
      hasCredential: true,
    })
    assert.strictEqual(selection.ok, false)
    assert.ok(selection.error instanceof GitAdapterError)
    assert.strictEqual(selection.error.problem, "host-mismatch")
    assert.ok(selection.error.message.includes("github.com"))
    assert.ok(selection.error.message.includes("gitlab.com"))
  })

  test("a self-hosted instance is accepted once its base URL is set", () => {
    const options = {
      id: "gitlab" as const,
      remoteHost: "gitlab.example.com",
      hasCredential: true,
    }
    // Without the base URL it is measured against gitlab.com and refused.
    assert.strictEqual(selectGitAdapter({ ...options, baseUrl: "" }).ok, false)
    assert.strictEqual(
      selectGitAdapter({ ...options, baseUrl: "https://gitlab.example.com" }).ok,
      true,
    )
  })

  test("no remote at all is a no-repo problem, not a host mismatch", () => {
    const selection = selectGitAdapter({
      id: "github",
      remoteHost: null,
      baseUrl: "",
      hasCredential: true,
    })
    assert.strictEqual(selection.ok, false)
    assert.strictEqual(selection.ok === false && selection.error.problem, "no-repo")
  })

  test("a adapter that needs a token and has none says so", () => {
    for (const id of ["github", "gitlab", "bitbucket"] as const) {
      const selection = selectGitAdapter({
        id,
        remoteHost: CLOUD_HOSTS[id] ?? "",
        baseUrl: "",
        hasCredential: false,
      })
      assert.strictEqual(selection.ok, false, `${id} should want a credential`)
      assert.strictEqual(selection.ok === false && selection.error.problem, "auth")
    }
  })

  /*
   * The CLI holds its own credentials. Refusing it because our keychain is
   * empty would reject a perfectly working `gh` over a token nobody wanted.
   */
  test("the CLI is not asked for a token we never store", () => {
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

  test("a mismatched host outranks a missing token, because it is the real problem", () => {
    const selection = selectGitAdapter({
      id: "gitlab",
      remoteHost: "github.com",
      baseUrl: "",
      hasCredential: false,
    })
    assert.strictEqual(selection.ok === false && selection.error.problem, "host-mismatch")
  })
})
