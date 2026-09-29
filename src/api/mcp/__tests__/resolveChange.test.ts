import * as assert from "assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll } from "vitest"
import { resolveChange } from "../resolveChange"

const run = promisify(execFile)

/**
 * What the agent used to fetch by hand.
 *
 * `begin-pr-description` asked for `head`, `base` and `title`, so a skill sent
 * an agent to `git remote get-url`, `gh auth status` and `gh pr view` before it
 * could make the first call — three shell commands to carry three facts the
 * tool is better placed to look up than the agent is.
 *
 * Almost all of it is local. A branch's head is `rev-parse`, its title is the
 * subject of its tip commit, and the base of anything is the merge base with
 * trunk. Only a pull request's title and head need the adapter, and only because
 * a pull request is a thing the host knows about and git does not.
 */
suite("resolving what a change is called", () => {
  let root = ""
  let branchTip = ""
  let forkPoint = ""

  const git = (...args: string[]) => run("git", args, { cwd: root })

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "fp-resolve-")))

    await git("init", "--quiet", "--initial-branch", "main")
    await git("config", "user.email", "test@example.com")
    await git("config", "user.name", "Test")

    await fs.writeFile(path.join(root, "a.ts"), "export const one = 1\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "first")
    forkPoint = (await git("rev-parse", "HEAD")).stdout.trim()

    await git("checkout", "--quiet", "-b", "feature")
    await fs.writeFile(path.join(root, "a.ts"), "export const two = 2\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "Move pricing behind a cache")
    branchTip = (await git("rev-parse", "HEAD")).stdout.trim()

    /*
     * Trunk moves after the branch forks, which is the case the base has to get
     * right. The merge base stays at the fork point; trunk's tip does not. A
     * base taken from the tip would show the branch as having undone whatever
     * trunk did since, which is somebody else's work appearing in this
     * walkthrough's diff.
     */
    await git("checkout", "--quiet", "main")
    await fs.writeFile(path.join(root, "b.ts"), "export const three = 3\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "unrelated work on trunk")
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  test("reads a branch's head, base and title out of git alone", async () => {
    const change = await resolveChange({ root, repo: "acme/shop", branch: "feature" })

    assert.strictEqual(change.head, branchTip)
    assert.strictEqual(change.base, forkPoint, "the base is not the merge base")
    // The closest local equivalent of a pull request title, and the same one
    // the panel already shows for a branch row.
    assert.strictEqual(change.title, "Move pricing behind a cache")
  })

  test("keeps whatever the caller already knew", async () => {
    // Nothing that works today stops working: a caller that still passes all
    // three is not made to look anything up.
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      branch: "feature",
      head: "b".repeat(40),
      base: "c".repeat(40),
      title: "What the human called it",
    })

    assert.strictEqual(change.head, "b".repeat(40))
    assert.strictEqual(change.base, "c".repeat(40))
    assert.strictEqual(change.title, "What the human called it")
  })

  test("fills in only the parts that are missing", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      branch: "feature",
      title: "What the human called it",
    })

    assert.strictEqual(change.title, "What the human called it")
    assert.strictEqual(change.head, branchTip)
    assert.strictEqual(change.base, forkPoint)
  })

  test("asks the adapter for a pull request, and still takes the base from git", async () => {
    /*
     * The one thing git cannot answer. A pull request is a thing the host knows
     * about; its number means nothing to a checkout. The base is still local,
     * because the merge base is a fact about commits rather than about the
     * host's opinion of them.
     */
    const asked: number[] = []
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 412,
      lookUpPullRequest: async (repo, number) => {
        assert.strictEqual(repo, "acme/shop")
        asked.push(number)
        return { title: "Move pricing behind a cache", head: branchTip }
      },
    })

    assert.deepStrictEqual(asked, [412])
    assert.strictEqual(change.head, branchTip)
    assert.strictEqual(change.base, forkPoint)
    assert.strictEqual(change.title, "Move pricing behind a cache")
  })

  test("says what to pass when nothing can answer for a pull request", async () => {
    // No window open, or a host the extension cannot reach. Refused with the
    // way out rather than a silent guess at a commit.
    await assert.rejects(
      resolveChange({
        root,
        repo: "acme/shop",
        pr: 412,
        lookUpPullRequest: async () => null,
      }),
      /head.*title|title.*head/s,
    )
  })

  test("says so when the branch is not in this checkout", async () => {
    await assert.rejects(
      resolveChange({ root, repo: "acme/shop", branch: "never-fetched" }),
      /never-fetched/,
    )
  })

  test("refuses a change with no name at all", async () => {
    await assert.rejects(
      resolveChange({ root, repo: "acme/shop" }),
      /pull request number or a branch/i,
    )
  })
})

/**
 * A pull request when the host cannot be reached.
 *
 * Only the *title* ever needed the adapter. The head commit is an ordinary git
 * ref on both hosts that matter — `refs/pull/N/head` on GitHub,
 * `refs/merge-requests/N/head` on GitLab — so failing the whole call over a
 * heading, while the commit sat in a ref the entire time, made a cosmetic
 * outage look like a broken tool.
 *
 * Its own checkout and its own bare remote, because this is the one case that
 * needs an `origin` to exist and the suite above deliberately has none.
 */
suite("a pull request with no host to ask", () => {
  let root = ""
  let tip = ""
  let unfetched = ""
  let first = ""

  const git = (...args: string[]) => run("git", args, { cwd: root })

  beforeAll(async () => {
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "fp-pr-")))
    const origin = path.join(parent, "origin.git")
    root = path.join(parent, "work")

    await run("git", ["init", "--quiet", "--bare", "--initial-branch", "main", origin])
    await run("git", ["init", "--quiet", "--initial-branch", "main", root])
    await git("config", "user.email", "test@example.com")
    await git("config", "user.name", "Test")
    await git("remote", "add", "origin", origin)

    await fs.writeFile(path.join(root, "a.ts"), "export const one = 1\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "first")
    await git("push", "--quiet", "origin", "main")

    await fs.writeFile(path.join(root, "a.ts"), "export const two = 2\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "feat: widen the gate")
    tip = (await git("rev-parse", "HEAD")).stdout.trim()

    // What the host would be asked for, as the ref the host already publishes.
    await git("push", "--quiet", "origin", `HEAD:refs/pull/412/head`)

    /*
     * Somebody else's pull request: pushed from another clone, so the host
     * has it and this checkout has never seen it.
     */
    const other = path.join(parent, "other")
    await run("git", ["clone", "--quiet", origin, other])
    const inOther = (...args: string[]) => run("git", args, { cwd: other })
    await inOther("config", "user.email", "test@example.com")
    await inOther("config", "user.name", "Test")
    await fs.writeFile(path.join(other, "c.ts"), "export const four = 4\n", "utf8")
    await inOther("add", ".")
    await inOther("commit", "--quiet", "-m", "feat: somebody else's change")
    unfetched = (await inOther("rev-parse", "HEAD")).stdout.trim()
    await inOther("push", "--quiet", "origin", `HEAD:refs/pull/413/head`)
    first = (await git("rev-parse", "origin/main")).stdout.trim()
  })

  test("fetches a head the host named but this checkout never fetched", async () => {
    /*
     * The host answers with a commit, not with its objects. Without the fetch
     * the merge base failed on the missing head and the refusal blamed trunk,
     * which was there the whole time.
     */
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 413,
      lookUpPullRequest: async () => ({ title: "Their change", head: unfetched, baseRef: "main" }),
    })

    assert.strictEqual(change.head, unfetched)
    assert.strictEqual(change.base, first)
  })

  test("names the missing head, not trunk, when it cannot be fetched", async () => {
    // A head no ref on `origin` carries: a force-pushed pull request, or a
    // host answering for a different repository than `origin` is.
    await assert.rejects(
      resolveChange({
        root,
        repo: "acme/shop",
        pr: 414,
        lookUpPullRequest: async () => ({ title: "Gone", head: "d".repeat(40), baseRef: "main" }),
      }),
      (error: Error) => {
        assert.match(error.message, /is not in this checkout and could not be fetched/)
        assert.match(error.message, /refs\/pull\/414\/head/)
        assert.doesNotMatch(error.message, /forked from/)
        return true
      },
    )
  })

  test("takes the head from git when the host answers nothing", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 412,
      lookUpPullRequest: async () => null,
    })

    assert.strictEqual(change.head, tip)
    // The same substitute the branch path already accepts.
    assert.strictEqual(change.title, "feat: widen the gate")
    assert.ok(
      change.notes.some((note) => note.includes("title")),
      `the degraded title should be reported: ${JSON.stringify(change.notes)}`,
    )
  })

  test("prefers the host when it does answer, and reports nothing", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 412,
      // A host naming the base is the ordinary answer; `main` is what an
      // unstacked pull request is opened against.
      lookUpPullRequest: async () => ({ title: "The real title", head: tip, baseRef: "main" }),
    })

    assert.strictEqual(change.title, "The real title")
    assert.deepStrictEqual(change.notes, [])
  })

  /*
   * A host that answers without naming a base has not said the base is trunk —
   * it has said nothing about the base. The two are indistinguishable from
   * here, and on a stack the difference is most of the diff, so it is noted
   * rather than assumed away. In practice this is version skew: a server newer
   * than the extension answering it.
   */
  test("cautions when the host answers without naming a base", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 412,
      lookUpPullRequest: async () => ({ title: "The real title", head: tip }),
    })

    assert.strictEqual(change.notes.length, 1)
    assert.match(change.notes[0] ?? "", /stacked on another/)
  })

  test("still refuses a pull request number that is on no ref", async () => {
    // Nothing knew about it and no ref carries it: the number is wrong, or
    // `origin` is not the repository the pull request is on.
    await assert.rejects(
      resolveChange({
        root,
        repo: "acme/shop",
        pr: 999,
        lookUpPullRequest: async () => null,
      }),
      /#999/,
    )
  })
})

/**
 * A stack, which is what trunk cannot answer for.
 *
 * Three pull requests, each opened against the one below it. Nothing in git
 * records that relationship, so the merge base with trunk reaches past every
 * pull request underneath and pulls their commits into this one's diff. This is
 * the only case where the base genuinely needs the host.
 */
suite("resolving a stacked pull request", () => {
  let root = ""
  let trunkTip = ""
  let lowerTip = ""
  let upperTip = ""

  const git = (...args: string[]) => run("git", args, { cwd: root })

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "fp-stack-")))
    await git("init", "--quiet", "--initial-branch", "main")
    await git("config", "user.email", "test@example.com")
    await git("config", "user.name", "Test")

    await fs.writeFile(path.join(root, "a.ts"), "export const one = 1\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "first")
    trunkTip = (await git("rev-parse", "HEAD")).stdout.trim()

    // PR #1: the bottom of the stack, opened against main.
    await git("checkout", "--quiet", "-b", "stack/lower")
    await fs.writeFile(path.join(root, "b.ts"), "export const two = 2\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "the pull request below")
    lowerTip = (await git("rev-parse", "HEAD")).stdout.trim()

    // PR #2: opened against `stack/lower`, not against main.
    await git("checkout", "--quiet", "-b", "stack/upper")
    await fs.writeFile(path.join(root, "c.ts"), "export const three = 3\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "the pull request under review")
    upperTip = (await git("rev-parse", "HEAD")).stdout.trim()
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  test("takes the base from the branch below it, not from trunk", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 2,
      lookUpPullRequest: async () => ({
        title: "The upper half of the stack",
        head: upperTip,
        baseRef: "stack/lower",
      }),
    })

    assert.strictEqual(change.head, upperTip)
    assert.strictEqual(change.base, lowerTip, "the base reached past the branch below")
    // The bug this fixes: trunk would have put the lower pull request's commit
    // inside this one's diff.
    assert.notStrictEqual(change.base, trunkTip)
    assert.deepStrictEqual(change.notes, [])
  })

  /*
   * The goal, stated in the terms somebody actually checks it in.
   *
   * Not "the base is this sha" but "the range contains this change's commits
   * and nobody else's" — which is what a reviewer sees, and the thing that was
   * wrong: the commit of the pull request below was showing up in this one.
   */
  test("leaves only the commits made on that branch in the range", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 2,
      lookUpPullRequest: async () => ({
        title: "The upper half of the stack",
        head: upperTip,
        baseRef: "stack/lower",
      }),
    })

    const listed = (await git("log", "--format=%s", `${change.base}..${change.head}`)).stdout
      .trim()
      .split("\n")
      .filter((line) => line !== "")

    assert.deepStrictEqual(listed, ["the pull request under review"])
    assert.ok(
      !listed.includes("the pull request below"),
      "the pull request below is in this one's range",
    )
  })

  test("still takes trunk when the pull request is opened against trunk", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 1,
      lookUpPullRequest: async () => ({
        title: "The lower half of the stack",
        head: lowerTip,
        baseRef: "main",
      }),
    })

    assert.strictEqual(change.base, trunkTip)
    assert.deepStrictEqual(change.notes, [])
  })

  test("uses the base sha when the branch name is not in the checkout", async () => {
    // A base branch deleted after merge, or one on a fork.
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 2,
      lookUpPullRequest: async () => ({
        title: "The upper half of the stack",
        head: upperTip,
        baseRef: "stack/deleted-after-merge",
        baseSha: lowerTip,
      }),
    })

    assert.strictEqual(change.base, lowerTip)
  })

  test("falls back to trunk and says so when the base cannot be resolved at all", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 2,
      lookUpPullRequest: async () => ({
        title: "The upper half of the stack",
        head: upperTip,
        baseRef: "stack/vanished",
      }),
    })

    assert.strictEqual(change.base, trunkTip)
    assert.strictEqual(change.notes.length, 1)
    assert.match(change.notes[0] ?? "", /stacked on another pull request/)
  })

  /*
   * The offline case. Trunk is the only thing left, and on a stack it is wrong
   * — so the document has to carry the caution rather than look correct.
   */
  test("cautions when the host could not say what the base is", async () => {
    const change = await resolveChange({
      root,
      repo: "acme/shop",
      pr: 2,
      head: upperTip,
      title: "Known already",
      lookUpPullRequest: async () => null,
    })

    assert.strictEqual(change.base, trunkTip)
    assert.strictEqual(change.notes.length, 1)
    assert.match(change.notes[0] ?? "", /stacked on another/)
  })

  test("says nothing extra for a plain branch, which has no declared base", async () => {
    const change = await resolveChange({ root, repo: "acme/shop", branch: "stack/upper" })
    assert.deepStrictEqual(change.notes, [])
  })
})
