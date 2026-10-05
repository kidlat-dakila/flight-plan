import * as assert from "node:assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { onTestFinished } from "vitest"
import { parseRemote, readRemote, repoName } from "@/git-adapter/helpers/remote"

const run = promisify(execFile)

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
  it.each(CASES)("$why", ({ url, host, owner, name }) => {
    assert.deepStrictEqual(parseRemote(url), { host, owner, name, fullName: `${owner}/${name}` })
  })

  it("a self-hosted host is kept whole, not reduced to its domain", () => {
    assert.strictEqual(parseRemote("https://ghe.example.com/a/b.git")?.host, "ghe.example.com")
    assert.strictEqual(parseRemote("https://gitlab.example.com/a/b.git")?.host, "gitlab.example.com")
  })

  it("credentials never survive into the parsed remote", () => {
    const parsed = parseRemote("https://user:s3cret@github.com/acme/storefront.git")
    assert.strictEqual(parsed?.host, "github.com")
    assert.strictEqual(parsed.fullName, "acme/storefront")
    assert.ok(!JSON.stringify(parsed).includes("s3cret"))
  })

  it("something that is not a hosted remote is null, not an exception", () => {
    assert.strictEqual(parseRemote("/local/path/repo"), null)
    assert.strictEqual(parseRemote(""), null)
    assert.strictEqual(parseRemote("   "), null)
  })
})

suite("naming the repository a checkout is in", () => {
  async function emptyFolder(prefix: string): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
    onTestFinished(async () => {
      await fs.rm(root, { recursive: true, force: true })
    })
    return root
  }

  async function checkout(remotes: [string, string][] = []): Promise<string> {
    const root = await emptyFolder("flightplan-remote-")
    await run("git", ["init", "-q"], { cwd: root })
    await remotes.reduce(async (previous, [name, url]) => {
      await previous
      await run("git", ["remote", "add", name, url], { cwd: root })
    }, Promise.resolve())
    return root
  }

  it("a checkout with no remote at all is null", async () => {
    const root = await checkout()
    assert.strictEqual(await readRemote(root), null)
    assert.strictEqual(await repoName(root), null)
  })

  it("origin is read when it is there", async () => {
    const root = await checkout([
      ["origin", "git@gitlab.example.com:group/sub/proj.git"],
    ])
    assert.strictEqual((await readRemote(root))?.fullName, "group/sub/proj")
    assert.strictEqual(await repoName(root), "group/sub/proj")
  })

  it("some other remote is used when there is no origin", async () => {
    const root = await checkout([
      ["upstream", "https://github.com/acme/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "acme/storefront")
  })

  it("origin wins when there are several", async () => {
    const root = await checkout([
      ["upstream", "https://github.com/acme/storefront.git"],
      ["origin", "https://github.com/me/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "me/storefront")
  })

  it("a remote that names no hosted repository is skipped", async () => {
    const root = await checkout([
      ["origin", "/srv/mirrors/storefront.git"],
      ["github", "https://github.com/acme/storefront.git"],
    ])
    assert.strictEqual(await repoName(root), "acme/storefront")
  })

  it("a directory that is not a repository is null rather than a failure", async () => {
    const empty = await emptyFolder("flightplan-bare-")
    assert.strictEqual(await readRemote(empty), null)
  })
})
