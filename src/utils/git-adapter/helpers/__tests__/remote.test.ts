import * as assert from "assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { parseRemote, readRemote, repoName } from "../remote"

const run = promisify(execFile)

/**
 * Every remote URL shape a real checkout produces.
 *
 * A table rather than a test each, because the interesting thing about these is
 * that they disagree with one another: the same repository is written five ways
 * depending on how it was cloned, and every one of them has to reduce to the
 * same `owner/name`. Read as a list, a disagreement is visible; read as twelve
 * separate tests, it is not.
 */
const CASES: {
  url: string
  host: string
  owner: string
  name: string
  why: string
}[] = [
  {
    url: "git@github.com:acme/storefront.git",
    host: "github.com",
    owner: "acme",
    name: "storefront",
    why: "scp-style, which is what an ssh clone writes and is not a URL at all",
  },
  {
    url: "https://github.com/acme/storefront.git",
    host: "github.com",
    owner: "acme",
    name: "storefront",
    why: "the ordinary https clone",
  },
  {
    url: "git@github.com:acme/storefront",
    host: "github.com",
    owner: "acme",
    name: "storefront",
    why: "no .git suffix, which is legal and common",
  },
  {
    url: "https://ghe.example.com/acme/storefront.git",
    host: "ghe.example.com",
    owner: "acme",
    name: "storefront",
    why: "GitHub Enterprise, the case that proves the host is not guessed",
  },
  {
    url: "git@gitlab.example.com:group/sub/proj.git",
    host: "gitlab.example.com",
    owner: "group/sub",
    name: "proj",
    why: "a GitLab subgroup: the owner has a slash in it and the name is the last segment",
  },
  {
    url: "ssh://git@gitlab.example.com:2222/group/sub/proj.git",
    host: "gitlab.example.com",
    owner: "group/sub",
    name: "proj",
    why: "ssh:// with a port, which the scp-style parser must not be handed",
  },
  {
    url: "https://token@gitlab.example.com/group/sub/proj.git",
    host: "gitlab.example.com",
    owner: "group/sub",
    name: "proj",
    why: "credentials in the URL, which must not end up in the host or the owner",
  },
  {
    url: "https://gitlab.com/group/sub/deeper/proj.git",
    host: "gitlab.com",
    owner: "group/sub/deeper",
    name: "proj",
    why: "GitLab allows more than one level of subgroup",
  },
  {
    url: "https://bitbucket.org/acme/storefront.git",
    host: "bitbucket.org",
    owner: "acme",
    name: "storefront",
    why: "Bitbucket Cloud, where the owner is called a workspace",
  },
  {
    url: "https://bitbucket.example.com/scm/PROJ/repo.git",
    host: "bitbucket.example.com",
    owner: "PROJ",
    name: "repo",
    why: "Bitbucket Data Center puts /scm/ in the path and it is not an owner",
  },
  {
    url: "https://bitbucket.example.com/projects/PROJ/repos/repo",
    host: "bitbucket.example.com",
    owner: "PROJ",
    name: "repo",
    why: "the same server's other path shape, copied from the web interface",
  },
]

suite("reading a remote URL", () => {
  for (const { url, host, owner, name, why } of CASES) {
    test(why, () => {
      const parsed = parseRemote(url)
      assert.notStrictEqual(parsed, null, `${url} did not parse`)
      assert.strictEqual(parsed?.host, host)
      assert.strictEqual(parsed?.owner, owner)
      assert.strictEqual(parsed?.name, name)
      assert.strictEqual(parsed?.fullName, `${owner}/${name}`)
    })
  }

  /*
   * The trap that decides whether self-hosted works at all.
   *
   * `git-url-parse` reports two host-ish fields and they are not the same:
   * `source` is the registrable domain, so a GitHub Enterprise server at
   * `ghe.example.com` comes back as `example.com`. Matching the configured
   * provider against `source` would therefore accept any host under the same
   * domain and reject the one the user actually configured. `resource` is the
   * full host, and it is the only one that can be compared.
   */
  test("a self-hosted host is kept whole, not reduced to its domain", () => {
    assert.strictEqual(parseRemote("https://ghe.example.com/a/b.git")?.host, "ghe.example.com")
    assert.strictEqual(parseRemote("https://gitlab.example.com/a/b.git")?.host, "gitlab.example.com")
  })

  test("credentials never survive into the parsed remote", () => {
    const parsed = parseRemote("https://user:s3cret@github.com/acme/storefront.git")
    assert.strictEqual(parsed?.host, "github.com")
    assert.strictEqual(parsed?.fullName, "acme/storefront")
    assert.ok(!JSON.stringify(parsed).includes("s3cret"))
  })

  /*
   * Null rather than a throw. A checkout with no remote, or a remote pointing at
   * a local path, is an ordinary state that the panel has to explain; making the
   * caller catch an exception to discover it puts the explanation in the wrong
   * place.
   */
  test("something that is not a hosted remote is null, not an exception", () => {
    assert.strictEqual(parseRemote("/local/path/repo"), null)
    assert.strictEqual(parseRemote(""), null)
    assert.strictEqual(parseRemote("   "), null)
  })
})

suite("naming the repository a checkout is in", () => {
  const made: string[] = []

  /** A throwaway checkout, optionally with remotes already added. */
  async function checkout(remotes: [string, string][] = []): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-remote-"))
    made.push(root)
    await run("git", ["init", "-q"], { cwd: root })
    for (const [name, url] of remotes) {
      await run("git", ["remote", "add", name, url], { cwd: root })
    }
    return root
  }

  afterAll(async () => {
    await Promise.all(
      made.map(async (root) => fs.rm(root, { recursive: true, force: true })),
    )
  })

  test("a checkout with no remote at all is null", async () => {
    const root = await checkout()
    assert.strictEqual(await readRemote(root), null)
    assert.strictEqual(await repoName(root), null)
  })

  test("origin is read when it is there", async () => {
    const root = await checkout([
      ["origin", "git@gitlab.example.com:group/sub/proj.git"],
    ])
    assert.strictEqual((await readRemote(root))?.fullName, "group/sub/proj")
    assert.strictEqual(await repoName(root), "group/sub/proj")
  })

  /*
   * Not everybody calls it `origin`. A checkout made by `gh repo fork` names the
   * parent `upstream`, and somebody who renamed theirs still has a repository
   * this can name; falling back costs one command and removes a dead end.
   */
  test("some other remote is used when there is no origin", async () => {
    const root = await checkout([
      ["upstream", "https://github.com/acme/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "acme/storefront")
  })

  test("origin wins when there are several", async () => {
    const root = await checkout([
      ["upstream", "https://github.com/acme/storefront.git"],
      ["origin", "https://github.com/me/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "me/storefront")
  })

  /*
   * A remote git accepts but this cannot name. The next remote is tried rather
   * than the whole lookup failing, because a checkout with a local mirror
   * beside its real remote is ordinary.
   */
  test("a remote that names no hosted repository is skipped", async () => {
    const root = await checkout([
      ["origin", "/srv/mirrors/storefront.git"],
      ["github", "https://github.com/acme/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "acme/storefront")
  })

  test("a directory that is not a repository is null rather than a failure", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-bare-"))
    made.push(empty)
    assert.strictEqual(await readRemote(empty), null)
  })
})
