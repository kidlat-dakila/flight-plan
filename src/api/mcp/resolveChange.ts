import { execFile } from "node:child_process"
import { promisify } from "node:util"

/**
 * What a change is called, worked out rather than carried.
 *
 * The first tool once required `head`, `base` and `title`, which sent an
 * agent to `git remote get-url`, `gh auth status` and `gh pr view` before it
 * could make its first call — three shell commands to ferry three facts, and
 * three chances to ferry the wrong ones.
 *
 * Almost all of it is local and always was. A branch's head is `rev-parse`, its
 * title is the subject of its tip commit, and the base of anything is its merge
 * base with trunk. Only a pull request's title and head need the host, because
 * a pull request number means nothing to a checkout — and that one question
 * goes to the extension, which already holds the adapter and the credentials.
 *
 * Every parameter stays optional-in, so a caller that knows an answer is never
 * made to look it up, and nothing that worked before stops working.
 */

const run = promisify(execFile)

export type Change = {
  head: string
  base: string
  title: string
  /** What had to be worked around, when anything did. Empty is the normal case. */
  notes: string[]
}

/**
 * What only the host can answer. Null when nothing could.
 *
 * `baseRef` is the branch the pull request is *opened against*, and it is the
 * whole reason this is not a purely local question. A checkout can work out the
 * merge base with trunk on its own; it cannot work out that this pull request
 * is stacked on another one, because nothing in git records that.
 */
export type PullRequestFacts = {
  title: string
  head: string
  /** The base branch's name, for example `main` or the branch below it in a stack. */
  baseRef?: string
  /** The base branch's tip, when the host reports it. */
  baseSha?: string
}

export type PullRequestLookup = (repo: string, pr: number) => Promise<PullRequestFacts | null>

export type ResolveOptions = {
  root: string
  repo: string
  pr?: number
  branch?: string
  head?: string
  base?: string
  title?: string
  lookUpPullRequest?: PullRequestLookup
}

async function git(root: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await run("git", args, {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    })
    return stdout.trim()
  } catch {
    return null
  }
}

/**
 * What this checkout treats as trunk.
 *
 * The remote's own `HEAD` first, which is the only answer that is not a guess,
 * then the names git itself would try. `origin/HEAD` is frequently missing — a
 * shallow clone never sets it, and neither does a `git remote add` after the
 * fact — so refusing without it would make the base unavailable for a reason
 * the reader could do nothing about.
 *
 * Mirrors `defaultBranch` in `src/api/git-adapter/git.ts` rather than importing it: that
 * module belongs to the extension and carries the whole adapter with it, where
 * this process wants fifteen lines and no dependency.
 */
async function trunk(root: string): Promise<string | null> {
  const symbolic = await git(root, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"])
  if (symbolic !== null && symbolic !== "") {
    const name = symbolic.replace(/^refs\/remotes\//, "")
    if (name !== "") return name
  }
  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    if ((await git(root, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`])) !== null) {
      return candidate
    }
  }
  return null
}

/**
 * The base a pull request is opened against, as a commit in this checkout.
 *
 * The fix for stacked pull requests, and the reason it needs the host at all.
 * A stack is a chain of pull requests each opened against the one below it, so
 * `feature-c` is based on `feature-b` and not on trunk. Taking the merge base
 * with trunk then reaches *past* `feature-b` and drags every commit of the pull
 * requests below into this one's diff — somebody else's work, attributed here.
 *
 * The branch name is preferred over the host's `baseSha`, and that ordering is
 * deliberate: the merge base with the branch stays right when the branch below
 * moves, where a recorded tip is a snapshot of where it was when the question
 * was asked. The sha is the fallback for a branch this checkout cannot name —
 * one deleted after merge, or a fork's.
 *
 * Returns null when nothing here can be resolved, which sends the caller back
 * to trunk with a note rather than to a guess.
 */
async function declaredBase(
  root: string,
  facts: { baseRef?: string; baseSha?: string },
): Promise<string | null> {
  const { baseRef, baseSha } = facts

  if (baseRef !== undefined && baseRef !== "") {
    let tip = await branchHead(root, baseRef)
    if (tip === null) {
      // Objects only: no branch is created and the working tree is untouched.
      await git(root, ["fetch", "--quiet", "origin", baseRef])
      tip = await branchHead(root, baseRef)
    }
    if (tip !== null) return tip
  }

  if (baseSha !== undefined && /^[0-9a-f]{7,40}$/.test(baseSha)) {
    if ((await git(root, ["cat-file", "-e", `${baseSha}^{commit}`])) !== null) return baseSha
  }

  return null
}

/** A branch as this checkout has it, preferring the remote's copy. */
async function branchHead(root: string, name: string): Promise<string | null> {
  for (const candidate of [`origin/${name}`, name]) {
    const sha = await git(root, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`])
    if (sha !== null && sha !== "") return sha
  }
  return null
}

/**
 * A pull request's head commit, from git alone.
 *
 * The fallback that makes a host outage a degradation rather than a stop. A
 * pull request's head is an ordinary git ref on both hosts that matter —
 * `refs/pull/N/head` on GitHub, `refs/merge-requests/N/head` on GitLab — so the
 * one fact the walkthrough genuinely cannot do without needs no API, no token
 * and no editor. Only the *title* ever needed the host, and a title is the
 * document's heading rather than anything the tour is built from.
 *
 * Both ref shapes are asked for at once. A host that has neither answers with
 * nothing, which is the same as not knowing, and costs one round trip to learn.
 */
async function pullRequestHead(root: string, pr: number): Promise<string | null> {
  const listed = await git(root, [
    "ls-remote",
    "origin",
    `refs/pull/${String(pr)}/head`,
    `refs/merge-requests/${String(pr)}/head`,
  ])
  if (listed === null || listed === "") return null
  const first = listed.split("\n")[0] ?? ""
  const sha = first.split(/\s+/)[0] ?? ""
  return /^[0-9a-f]{7,40}$/.test(sha) ? sha : null
}

/**
 * Makes sure a commit is actually here, fetching the one ref if it is not.
 *
 * `ls-remote` reports what the host has, which is not the same as what this
 * checkout holds: a pull request nobody has fetched is a name and no objects.
 * Everything downstream — the diff, the worktree, every symbol question — reads
 * those objects, so a head that is not here is not a head anybody can use.
 *
 * The fetch adds objects and nothing else. No branch is created, no ref is
 * moved and the working tree is untouched, which is why it is safe to do
 * without asking: it is the same thing the reader would be told to type.
 */
async function ensureLocal(root: string, sha: string, pr: number): Promise<boolean> {
  const present = await git(root, ["cat-file", "-e", `${sha}^{commit}`])
  if (present !== null) return true
  for (const ref of [`refs/pull/${String(pr)}/head`, `refs/merge-requests/${String(pr)}/head`]) {
    await git(root, ["fetch", "--quiet", "origin", ref])
    if ((await git(root, ["cat-file", "-e", `${sha}^{commit}`])) !== null) return true
  }
  return false
}

export async function resolveChange(options: ResolveOptions): Promise<Change> {
  const { root, repo, pr, branch } = options

  if (pr === undefined && branch === undefined) {
    throw new Error(
      "A change is named by a pull request number or a branch, and neither was given.",
    )
  }

  let head = options.head
  let title = options.title
  /** What the host said the pull request is opened against. Empty for a branch. */
  let declared: { baseRef?: string; baseSha?: string } = {}
  /** Whether a pull request's base went unanswered, which trunk cannot stand in for. */
  let baseUnknown = false

  if ((head === undefined || title === undefined) && branch !== undefined) {
    const sha = await branchHead(root, branch)
    if (sha === null) {
      throw new Error(
        `The branch \`${branch}\` is not in this checkout. Fetch it and try again, or pass \`head\` and \`title\` yourself.`,
      )
    }
    head ??= sha
    // The closest local equivalent of a pull request title, and the same line
    // the panel already shows on a branch row.
    title ??= (await git(root, ["log", "-1", "--format=%s", sha])) ?? branch
  }

  const notes: string[] = []

  /*
   * The host is asked whenever a pull request's base is still open, and not
   * only when its head or title are.
   *
   * It used to be asked only for head and title, so a caller that already knew
   * those — which the tool encourages, since both are cheap to carry — skipped
   * the host entirely and took trunk for the base without a word. On a stacked
   * pull request that is the failure this whole change is about, arriving
   * silently and by the path a well-informed caller takes.
   */
  const wantsBase = pr !== undefined && options.base === undefined
  if ((head === undefined || title === undefined || wantsBase) && pr !== undefined) {
    const found = await options.lookUpPullRequest?.(repo, pr)
    if (found !== null && found !== undefined) {
      head ??= found.head
      title ??= found.title
      declared = { baseRef: found.baseRef, baseSha: found.baseSha }
      // A host that answered without naming a base has still left it unknown.
      if (wantsBase && found.baseRef === undefined && found.baseSha === undefined) {
        baseUnknown = true
      }
    } else if (head !== undefined && title !== undefined) {
      /*
       * Nothing to fail over: the caller already had the two facts that matter,
       * and only the base went unanswered. Noted below rather than refused.
       */
      baseUnknown = true
    } else {
      baseUnknown = true
      /*
       * The host could not be reached, which is not the same as not knowing.
       *
       * Only the title ever needed it. Failing the whole call over a heading,
       * while the head commit sat in an ordinary git ref the entire time, made
       * a cosmetic outage look like a broken tool -- and sent somebody to open
       * a window for a fact no window was holding.
       */
      const sha = await pullRequestHead(root, pr)
      if (sha === null) {
        throw new Error(
          `Nothing could find pull request #${String(pr)} in ${repo}. The host could not be reached -- no VS Code window has the repository open, or its gitAdapter refused -- and \`git ls-remote origin refs/pull/${String(pr)}/head\` found nothing either, which usually means the number is wrong or \`origin\` is not the repository the pull request is on. Check the number, or pass \`head\` and \`title\` yourself and skip the lookup.`,
        )
      }

      if (!(await ensureLocal(root, sha, pr))) {
        throw new Error(
          `Pull request #${String(pr)} in ${repo} is commit ${sha.slice(0, 8)}, but that commit is not in this checkout and could not be fetched. Run \`git fetch origin refs/pull/${String(pr)}/head\` and try again.`,
        )
      }

      head ??= sha
      if (title === undefined) {
        // The same substitute the branch path above already accepts, for the
        // same reason: the tip commit's subject is the closest local equivalent
        // of a pull request's title.
        title = (await git(root, ["log", "-1", "--format=%s", sha])) ?? `Pull request #${String(pr)}`
        notes.push(
          `The host could not be reached, so the title is the head commit's subject rather than the pull request's own. Correct it with \`set-walkthrough-context\`, or scaffold again once a window is open.`,
        )
      }
    }
  }

  if (head === undefined || title === undefined) {
    throw new Error(
      `Could not work out the head commit and title for ${repo}. Pass \`head\` and \`title\`.`,
    )
  }

  /*
   * The head has to be here before anything asks git about it.
   *
   * The host names a pull request's head without fetching it, and a caller can
   * pass one it read somewhere else. Unchecked, the merge base below failed on
   * the missing commit and the refusal blamed trunk, which was there all along:
   * the reader fetched trunk, nothing changed, and the fix was a different
   * fetch entirely.
   *
   * Only when the base is still to be worked out here. A caller that passed
   * all three is trusted with them, as it always was.
   */
  const present =
    options.base !== undefined ||
    (pr !== undefined
      ? await ensureLocal(root, head, pr)
      : (await git(root, ["cat-file", "-e", `${head}^{commit}`])) !== null)
  if (!present) {
    throw new Error(
      pr !== undefined
        ? `Pull request #${String(pr)} in ${repo} is commit ${head.slice(0, 8)}, but that commit is not in this checkout and could not be fetched. Run \`git fetch origin refs/pull/${String(pr)}/head\` and try again.`
        : `The head commit ${head.slice(0, 8)} is not in this checkout. Fetch it and try again.`,
    )
  }

  let base = options.base

  /*
   * The pull request's own base first, and trunk only as a fallback.
   *
   * This used to go straight to trunk, which is right for the ordinary case and
   * wrong for every stacked pull request: a stack is a chain of pull requests
   * each opened against the one below it, and the merge base with trunk reaches
   * past all of them. The symptom is a walkthrough whose diff contains the
   * commits of the pull requests underneath it.
   */
  if (base === undefined && (declared.baseRef !== undefined || declared.baseSha !== undefined)) {
    const against = await declaredBase(root, declared)
    if (against !== null) {
      base = (await git(root, ["merge-base", against, head])) ?? undefined
    }
    if (base === undefined) {
      notes.push(
        `This pull request is opened against \`${declared.baseRef ?? declared.baseSha ?? "its base"}\`, which is not in this checkout and could not be fetched, so the base is the merge base with trunk instead. If it is stacked on another pull request, the diff below includes that one's commits. Fetch the base branch and scaffold again, or pass \`base\` yourself.`,
      )
    }
  }

  if (base === undefined) {
    /*
     * The merge base, not trunk's tip.
     *
     * Trunk moves while a branch is open. Taking the tip would show the branch
     * as having undone whatever trunk did since it forked — somebody else's
     * work appearing in this walkthrough's diff, attributed to this change.
     */
    const main = await trunk(root)
    if (main !== null) base = (await git(root, ["merge-base", main, head])) ?? undefined

    /*
     * Said out loud, because trunk is a guess here rather than an answer.
     *
     * Only when a pull request's base went unanswered. A branch has no declared
     * base for anything to disagree with, so trunk is simply correct and a
     * caution there would be noise on every ordinary scaffold.
     */
    if (baseUnknown && base !== undefined) {
      notes.push(
        `The host could not be reached, so the base is the merge base with trunk rather than the pull request's own. If this pull request is stacked on another, the diff below includes the commits of the ones underneath it.`,
      )
    }
  }
  if (base === undefined || base === "") {
    throw new Error(
      `Could not work out what ${repo} forked from, so the changed lines cannot be highlighted. Pass \`base\`, or fetch trunk into this checkout.`,
    )
  }

  return { head, base, title, notes }
}
