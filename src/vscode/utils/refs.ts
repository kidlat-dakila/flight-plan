/** A pasted reference, once it is known to name a pull request in this repo. */
export type PullRequestRef =
  | { ok: true; number: number }
  | { ok: false; reason: string }

const PULL_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:[/?#].*)?$/

const SHORTHAND = /^([^/\s]+)\/([^/#\s]+)#(\d+)$/

const BARE = /^#?(\d+)$/

/** True when two `owner/repo` names are the same repository. */
function sameRepo(a: string, b: string): boolean {
  // GitHub is case-insensitive about both halves, so refusing `Acme/Storefront`
  // against a remote that says `acme/storefront` would refuse the repository
  // the window actually has open.
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Reads whatever was pasted into the number of a pull request in this repo.
 *
 * Three forms, because all three are things people have in their clipboard: the
 * URL from the browser, which arrives with the tab and sometimes a comment
 * anchor still on the end of it; `owner/repo#123`, which is what GitHub itself
 * writes in a comment; and a bare number, which is what a colleague types.
 *
 * A pull request in another repository is refused rather than pinned, and the
 * refusal names both repositories: "that is not this one" is only useful if the
 * reader can see which one they pasted.
 */
export function parsePullRequestRef(text: string, repo: string): PullRequestRef {
  const trimmed = text.trim()
  if (trimmed === "") return { ok: false, reason: "Paste a pull request link." }

  const elsewhere = (theirs: string): PullRequestRef => ({
    ok: false,
    reason: `That pull request is in ${theirs}. This window has ${repo} open, so open that repository to pin its pull requests.`,
  })

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL
    try {
      url = new URL(trimmed)
    } catch {
      return { ok: false, reason: "That is not a link Flight Plan can read." }
    }
    if (url.hostname.toLowerCase() !== "github.com") {
      return {
        ok: false,
        reason: `${url.hostname} is not github.com. Flight Plan reads pull requests through the GitHub CLI.`,
      }
    }
    const parts = PULL_PATH.exec(url.pathname)
    if (parts === null) {
      return {
        ok: false,
        reason: "That link does not point at a pull request. A pull request link looks like https://github.com/owner/repo/pull/123.",
      }
    }
    const theirs = `${parts[1] ?? ""}/${parts[2] ?? ""}`
    if (repo === "") return { ok: false, reason: unknownRepo }
    if (!sameRepo(theirs, repo)) return elsewhere(theirs)
    return numbered(parts[3])
  }

  const short = SHORTHAND.exec(trimmed)
  if (short !== null) {
    const theirs = `${short[1] ?? ""}/${short[2] ?? ""}`
    if (repo === "") return { ok: false, reason: unknownRepo }
    if (!sameRepo(theirs, repo)) return elsewhere(theirs)
    return numbered(short[3])
  }

  const bare = BARE.exec(trimmed)
  if (bare !== null) {
    // A bare number means "in this repository", so there has to be one.
    if (repo === "") return { ok: false, reason: unknownRepo }
    return numbered(bare[1])
  }

  return {
    ok: false,
    reason: "Paste a link like https://github.com/owner/repo/pull/123, or just the number.",
  }
}

const unknownRepo =
  "Flight Plan has not worked out which repository this window has open yet. Refresh the list and try again."

function numbered(digits: string | undefined): PullRequestRef {
  const number = Number(digits)
  if (!Number.isInteger(number) || number <= 0) {
    return { ok: false, reason: "A pull request number starts at 1." }
  }
  return { ok: true, number }
}

/** A typed branch name, once it is known to be one git would accept. */
export type BranchName =
  | { ok: true; name: string }
  | { ok: false; reason: string }

/**
 * Whether something is usable as a branch name.
 *
 * git's own rules, in the ones worth enforcing here: no spaces, no `..`, no
 * leading or trailing slash, none of the characters git reserves. Checked
 * before the branch is looked for, so a typo is refused with the cursor still
 * in the box rather than becoming "that branch is not in this checkout", which
 * reads as a fetch problem.
 */
export function parseBranchName(text: string): BranchName {
  const trimmed = text.trim()
  if (trimmed === "") return { ok: false, reason: "Type a branch name." }
  if (/\s/.test(trimmed)) {
    return { ok: false, reason: "A branch name cannot contain spaces." }
  }
  if (trimmed.includes("..")) {
    return { ok: false, reason: "A branch name cannot contain `..`." }
  }
  if (/^[/-]|\/$|\.lock$/.test(trimmed)) {
    return {
      ok: false,
      reason: "A branch name cannot start with a slash or dash, or end with a slash or .lock.",
    }
  }
  if (/[~^:?*\[\\]/.test(trimmed)) {
    return { ok: false, reason: "A branch name cannot contain ~ ^ : ? * [ or a backslash." }
  }
  return { ok: true, name: trimmed }
}
