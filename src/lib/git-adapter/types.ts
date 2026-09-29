/**
 * What Flight Plan needs from a code host, and what it does without one.
 *
 * The extension used to reach GitHub by shelling out to `gh` from eight places,
 * which made one program's presence a hidden requirement of features that have
 * nothing to do with it. This is the seam that removes that: everything a host
 * is asked for goes through one interface, and everything a host cannot do is
 * declared rather than discovered by catching an exception.
 *
 * "GitAdapter" rather than "git provider" because git is one of the implementations.
 * A adapter is the hosted review apparatus around a repository — pull requests,
 * comments, diffs — and plain git has none of it, which is precisely the case
 * this interface has to express rather than treat as a failure.
 */

/**
 * One thing a adapter can be asked to do.
 *
 * Declared per provider, not probed. The pull request list has buttons that
 * only some hosts can answer, and a button that looks live and then explains
 * itself in a toast is worse than one that is visibly unavailable. Reading a
 * declared set is also the only way the prose in the setup view can be
 * generated from the behaviour instead of drifting away from it.
 */
export type Capability =
  /** Enumerate review targets. Plain git cannot: nothing local knows them. */
  | "list"
  /** Enumerate the repository's labels, for the label filter. */
  | "labels"
  /** Filter the list server-side by review state. */
  | "filters"
  /** The whole unified diff of a target, base to head. */
  | "diff"
  /** The diff between two commits, for the staleness check. */
  | "compare"
  /** A file's contents at a commit. */
  | "blob"
  /** The commit at the head of a target. */
  | "headSha"
  /** Deep links into the host's own diff view. */
  | "permalink"
  /**
   * Who is reviewing a target, and where each of them has got to.
   *
   * Its own capability rather than part of `list`, because it is the one thing
   * here that plain git cannot even approximate: a branch has an author in its
   * reflog and no reviewers anywhere. The header reads this to decide whether
   * it can show people at all, or only a branch name.
   */
  | "reviewers"

export type GitAdapterId = "git" | "gh" | "github" | "gitlab" | "bitbucket"

/**
 * What went wrong, for a caller that has to show it rather than log it.
 *
 * A field rather than a string a view matches against. The list, the panel and
 * the setup view each say something different for each of these, and re-parsing
 * the prose to work out which one it is puts the wording and the behaviour in
 * two places that then disagree.
 */
export type GitAdapterProblem =
  /** A required command line tool is not on the PATH. */
  | "no-cli"
  /** Not signed in, no token, or the token cannot see this repository. */
  | "auth"
  /** Not a repository, or it has no remote this adapter recognises. */
  | "no-repo"
  /** The chosen adapter does not offer this at all. */
  | "unsupported"
  /** The remote is on a host the chosen adapter does not serve. */
  | "host-mismatch"
  /** The host could not be reached. */
  | "network"
  | "unknown"

export class GitAdapterError extends Error {
  constructor(
    message: string,
    readonly problem: GitAdapterProblem = "unknown",
  ) {
    super(message)
  }
}

/**
 * What a row in the review list points at.
 *
 * Two kinds, because plain git has no pull requests and a branch is not one.
 * Modelling a branch as a pull request with a made-up number would put that
 * fiction into the storage paths, the permalinks and the pins, where it would
 * be indistinguishable from a real number that happened to collide with it.
 */
export type TargetRef =
  | { kind: "pr"; number: number }
  | { kind: "branch"; name: string }

/** A stable string for a ref, for storage keys and map lookups. */
export function refKey(ref: TargetRef): string {
  return ref.kind === "pr" ? `pr-${String(ref.number)}` : `branch-${ref.name}`
}

/**
 * A ref back from its key, or null when the key is not one.
 *
 * Needed because pins are stored, and stored data outlives the version that
 * wrote it. A key from a later version, or one somebody hand-edited, costs that
 * pin rather than the panel.
 *
 * A plain number is accepted too. That is what pins were before branches
 * existed, and refusing them would silently empty the pin list of everybody who
 * had one — on an upgrade, with nothing to say why.
 */
export function parseRefKey(value: unknown): TargetRef | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0
      ? { kind: "pr", number: value }
      : null
  }
  if (typeof value !== "string") return null
  if (value.startsWith("pr-")) {
    const number = Number(value.slice(3))
    return Number.isInteger(number) && number > 0
      ? { kind: "pr", number }
      : null
  }
  if (value.startsWith("branch-")) {
    const name = value.slice("branch-".length)
    return name === "" ? null : { kind: "branch", name }
  }
  return null
}

export function sameRef(a: TargetRef, b: TargetRef): boolean {
  return refKey(a) === refKey(b)
}

/** How a row is described to a reader. */
export type ReviewTarget = {
  ref: TargetRef
  title: string
  author: string
  /** Where it lives on the web. Empty in git mode: there is nowhere to go. */
  url: string
  /** ISO 8601. Empty when the adapter does not report one. */
  updatedAt: string
  isDraft: boolean
  /**
   * The branch this is opened against, when the host says.
   *
   * The one fact about a pull request that a checkout genuinely cannot work
   * out. Git records no relationship between branches, so nothing local can
   * tell that this pull request is stacked on another rather than on trunk —
   * and taking the merge base with trunk instead reaches past every pull
   * request underneath and pulls their commits into this one's diff.
   *
   * Optional, because a host may not say and git mode has no pull requests at
   * all. An absent value is "nobody said", never "it is trunk": the caller
   * falls back to trunk and reports that it did.
   */
  baseRef?: string
  /** That branch's tip, for a base branch this checkout cannot name. */
  baseSha?: string
  /** Why it is in the list. */
  reason: "review-requested" | "mine" | "query" | "pinned" | "added"
}

/**
 * How far one reviewer has got.
 *
 * Four states, because four is what every host actually distinguishes and what
 * a reader needs: whether anyone is still expected to look, whether anyone
 * objected, and whether a comment was a judgement or just a remark.
 *
 * `commented` is deliberately separate from `pending`. Somebody who has read
 * the change and left notes without approving or objecting has done something,
 * and folding them into "not looked yet" would misreport the one case where a
 * reader most wants to go and read the thread.
 */
export type ReviewState =
  /** Requested, and has not submitted anything. */
  | "pending"
  | "approved"
  | "changes-requested"
  /** Submitted comments without approving or objecting. */
  | "commented"

/**
 * Someone shown in the header.
 *
 * `avatarUrl` is the host's own URL and is never loaded by the webview, whose
 * CSP forbids it. The extension fetches it and hands the panel a `data:` URI;
 * see `src/api/pr/avatars.ts`. Empty when the host offers no picture, which the
 * header draws as a monogram.
 */
export type Person = {
  /** The handle, which is what the other adapters show and what fits a chip. */
  login: string
  /** A person's name, when the host distinguishes it from the handle. */
  name?: string
  avatarUrl: string
}

export type Reviewer = Person & { state: ReviewState }

/**
 * Everyone attached to a target, for the header.
 *
 * The author rides along rather than being read off `ReviewTarget.author`,
 * which is a bare string with no picture. Returning both together also means
 * one call answers the whole header instead of two that can disagree about
 * which revision they describe.
 */
export type ReviewSummary = { author: Person; reviewers: Reviewer[] }

/**
 * One entry per person, newest state wins, in the order the host listed them.
 *
 * Every host can name the same person twice — GitHub returns one row per
 * submitted review and another in the re-request list, GitLab lists a reviewer
 * who is also an approver — and a header that drew a duplicate avatar would
 * read as two different people at different stages.
 *
 * Order is the host's, not a ranking by state. Sorting by severity would be
 * more scannable for exactly as long as nobody reviews anything: a state
 * change would then move an avatar, and a row of faces that rearranges itself
 * is one nobody can build a habit around.
 */
export function mergeReviewers(found: readonly Reviewer[]): Reviewer[] {
  const byLogin = new Map<string, Reviewer>()
  for (const reviewer of found) {
    const key = reviewer.login.toLowerCase()
    if (key === "") continue
    const seen = byLogin.get(key)
    byLogin.set(key, {
      ...reviewer,
      // A later row may be the one with the picture, or the one with the real
      // name; neither should be lost to a row that merely repeats the handle.
      avatarUrl: reviewer.avatarUrl === "" ? (seen?.avatarUrl ?? "") : reviewer.avatarUrl,
      name: reviewer.name ?? seen?.name,
    })
  }
  return [...byLogin.values()]
}

export type ChangedFile = {
  path: string
  status: string
  /** Set on a rename, so a citation to the old path can be recognised. */
  previousPath?: string
  /** Unified diff. Absent for binary files and very large ones. */
  patch?: string
}

export type Comparison = { files: ChangedFile[]; commits: number }

export type LineRange = { from: number; to: number }

/** Which review states to ask for, and which labels must be present. */
export type Filter = {
  review: readonly string[]
  labels: readonly string[]
}

export type ListOptions = {
  query?: string
  filter?: Filter
  includeMine?: boolean
  pinned?: readonly TargetRef[]
  limit?: number
}

/**
 * One review filter a adapter offers, in that adapter's own vocabulary.
 *
 * Offered by the adapter rather than fixed, because these do not translate.
 * GitHub's `review:changes_requested` has no GitLab equivalent, GitLab's
 * approval rules have no GitHub one, and Bitbucket's query language expresses
 * almost none of it. A fixed list would mean showing every reader a picker of
 * options that silently do nothing on their host.
 */
export type ReviewFilterOption = { key: string; label: string }

/**
 * The one interface every code host is reached through.
 *
 * Bound to a single repository at construction, so no method takes a working
 * directory or a repository name. That is deliberate: threading `cwd` through
 * every call is what let the old code resolve a different repository per call
 * without anybody noticing, and it made a method's answer depend on state the
 * signature did not mention.
 *
 * Every method may throw `GitAdapterError`. A method whose capability is absent
 * throws `unsupported` rather than returning empty, so a caller that forgot to
 * check the capability fails loudly instead of showing a plausible blank.
 */
export type GitAdapter = {
  readonly id: GitAdapterId
  /** For prose. "the GitHub CLI", "GitLab", "git". */
  readonly name: string
  readonly capabilities: ReadonlySet<Capability>
  /** `owner/name`, as the remote gives it. */
  readonly repo: string

  supports: (capability: Capability) => boolean

  /** The review filters this adapter offers, in its own vocabulary. */
  reviewFilters: () => readonly ReviewFilterOption[]

  listTargets: (options: ListOptions) => Promise<ReviewTarget[]>
  /** One target by ref, or null when it is closed, merged or gone. */
  target: (ref: TargetRef) => Promise<ReviewTarget | null>
  listLabels: () => Promise<string[]>
  /** The author and the reviewers, with each reviewer's state. */
  reviewers: (ref: TargetRef) => Promise<ReviewSummary>
  headSha: (ref: TargetRef) => Promise<string>
  diff: (ref: TargetRef) => Promise<string>
  compare: (base: string, head: string) => Promise<Comparison>
  blob: (path: string, sha: string) => Promise<string>
  /** A link into the host's diff view. Never called without `permalink`. */
  permalink: (ref: TargetRef, path: string, range?: LineRange) => string
}

/**
 * Whether two commit identifiers name the same commit.
 *
 * Not `===`, because they are not always the same length. Bitbucket returns
 * abbreviated hashes — its own schema allows seven characters and up, and live
 * responses come back at twelve — while a walkthrough's `meta.head` records
 * whatever full SHA it was written against. String equality between those two
 * is false for the same commit, which would report every Bitbucket walkthrough
 * as out of date on the commit it was written against.
 *
 * Git's own rule: one is a prefix of the other, and the shorter is long enough
 * to be meant as an abbreviation rather than a typo.
 */
export function sameCommit(a: string, b: string): boolean {
  const left = a.trim().toLowerCase()
  const right = b.trim().toLowerCase()
  if (left === "" || right === "") return false
  // Identical is identical, whatever the length. The minimum below governs
  // *abbreviation*, not equality: applying it to two equal strings would make
  // a commit fail to match itself, which is how a test caught it.
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = shorter === left ? right : left
  if (shorter.length < 7) return false
  return longer.startsWith(shorter)
}

/** Builds the `unsupported` refusal, so every provider words it the same way. */
export function unsupported(gitAdapter: string, what: string): GitAdapterError {
  return new GitAdapterError(`${gitAdapter} cannot ${what}.`, "unsupported")
}

/** Injected, so every adapter is testable without a network. */
export type Fetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>
