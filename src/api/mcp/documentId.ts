import * as path from "node:path"
import { PLAN_NAME_PATTERN, REPO_PATTERN } from "./contract"

/**
 * A document's `{id}`, and the one place that maps it to a file.
 *
 * `{kind}/{owner}/{repo}/{name}`: the kind picks the storage root, the rest is
 * the file's path under it without `.json`. So a pull request's walkthrough is
 * `walkthrough/acme/storefront/pr-412`, stored at
 * `<walkthroughRoot>/acme/storefront/pr-412.json`. There is no index and no id
 * inside the document: the path is the id.
 *
 * Built and parsed here and nowhere else, and every file is confined to its
 * root here. Storage asks this module for a file and never joins one itself,
 * so the rule that decides which file a name reaches cannot exist twice.
 *
 * The id is not a filesystem path: it carries no root, so handing it to an
 * agent or a URL says nothing about where documents live.
 */

export class StorageError extends Error {}

export const DOCUMENT_KINDS = ["walkthrough", "plan"] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

/**
 * The first segment the samples use instead of a kind.
 *
 * Reserved so no stored document can ever be addressed as a sample, or a
 * sample as a stored document.
 */
export const SAMPLE_SEGMENT = "sample"

export type DocumentId = {
  kind: DocumentKind
  /** Two or more segments: `acme/storefront`, or a nested GitLab group. */
  repo: string
  /**
   * The file under the repository, without `.json`: `pr-412` or
   * `branch-<escaped name>` for a walkthrough, the plan's name for a plan.
   * Always one segment, which is what makes a nested repository unambiguous.
   */
  name: string
}

/**
 * What a walkthrough is filed under.
 *
 * A pull request has a number. A branch reviewed with plain git has only its
 * name, and there is no number to invent that would not later collide with a
 * real pull request.
 */
export type WalkthroughKey =
  | { kind: "pr"; number: number }
  | { kind: "branch"; name: string }

export type StorageConfig = {
  /** Root for pull request walkthroughs. */
  walkthroughRoot: string
  /** Root for implementation plans. */
  planRoot: string
}

/**
 * Splits a repository name into path segments, rejecting anything that escapes.
 *
 * Two or more segments, not exactly two: GitLab nests groups, so
 * `group/subgroup/project` is one project and its documents belong in a directory
 * of their own rather than colliding with `group/subgroup`.
 */
export function splitRepo(repo: string): string[] {
  if (!REPO_PATTERN.test(repo)) {
    throw new StorageError(
      `"${repo}" is not a repository. Give it as owner/repo, for example acme/storefront.`,
    )
  }
  const segments = repo.split("/")
  // The pattern already excludes separators, so `.` and `..` are the only
  // traversal segments that can reach here.
  if (segments.some((segment) => segment === "" || isDotted(segment))) {
    throw new StorageError(`"${repo}" is not a repository name.`)
  }
  return segments
}

function isDotted(segment: string): boolean {
  return segment === "." || segment === ".."
}

/**
 * A branch name as one filesystem-safe segment.
 *
 * Percent-encoded rather than substituted, because a branch name may contain
 * slashes — `feature/checkout-v2` is ordinary — and any scheme that maps two
 * different characters onto one lets two branches share a file. The `branch-`
 * prefix the caller adds is what makes `.` and `..` harmless here, since
 * neither can be the whole segment once it is prefixed.
 *
 * One limitation, stated because it cannot be fixed here: a case-insensitive
 * filesystem cannot tell `Feature` from `feature`, and git can. Two branches
 * differing only in case would share a file on macOS and Windows.
 */
function branchSlug(branch: string): string {
  const trimmed = branch.trim()
  if (trimmed === "") throw new StorageError("A branch needs a name.")
  return trimmed.replace(/[^A-Za-z0-9._-]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  )
}

/** A walkthrough's name: `pr-412`, or `branch-` and the escaped branch. */
export function walkthroughName(key: WalkthroughKey): string {
  if (key.kind === "branch") return `branch-${branchSlug(key.name)}`
  if (!Number.isInteger(key.number) || key.number < 1) {
    throw new StorageError(`${String(key.number)} is not a pull request number.`)
  }
  return `pr-${String(key.number)}`
}

/**
 * A walkthrough's name read back: `pr-412` or `branch-<escaped>`.
 *
 * Null for anything `walkthroughName` could not have produced, including an
 * escape it would not have written.
 */
export function walkthroughKeyOf(name: string): WalkthroughKey | null {
  const pr = /^pr-([1-9][0-9]*)$/.exec(name)
  if (pr !== null) return { kind: "pr", number: Number(pr[1]) }
  if (!name.startsWith("branch-")) return null
  let branch: string
  try {
    branch = decodeURIComponent(name.slice("branch-".length))
  } catch {
    return null
  }
  if (branch.trim() === "") return null
  try {
    return walkthroughName({ kind: "branch", name: branch }) === name
      ? { kind: "branch", name: branch }
      : null
  } catch {
    return null
  }
}

/** `walkthrough/acme/storefront/pr-412`. */
export function formatId(id: DocumentId): string {
  return `${id.kind}/${id.repo}/${id.name}`
}

/** A walkthrough's name is one of these, and nothing else. */
const WALKTHROUGH_NAME = /^(?:pr-[1-9][0-9]*|branch-[A-Za-z0-9._%-]+)$/

function isKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value)
}

/**
 * An `{id}` read back, or null when it names nothing a document could be.
 *
 * The name is always one segment, so the repository is every segment between
 * the kind and the last one — which holds for a nested GitLab group too.
 *
 * Shape only. Whether the file is inside its root is `fileOfId`'s question.
 */
export function parseId(text: string): DocumentId | null {
  const segments = text.split("/")
  const [kind, ...rest] = segments
  if (kind === undefined || !isKind(kind)) return null
  if (segments.some((segment) => segment === "" || isDotted(segment))) return null
  if (rest.length < 3) return null
  const name = rest[rest.length - 1] ?? ""
  const valid = kind === "walkthrough" ? WALKTHROUGH_NAME.test(name) : PLAN_NAME_PATTERN.test(name)
  if (!valid) return null
  return { kind, repo: rest.slice(0, -1).join("/"), name }
}

/**
 * The file an id is stored in, confined to its root.
 *
 * Throws rather than returning null, with a message a tool can pass on: every
 * caller is a write or a read an agent asked for, and "not found" would hide
 * that the name itself was refused.
 */
export function fileOfId(config: StorageConfig, id: DocumentId): string {
  const segments = splitRepo(id.repo)

  if (id.kind === "walkthrough") {
    if (!WALKTHROUGH_NAME.test(id.name)) {
      throw new StorageError(`"${id.name}" is not a pull request or branch.`)
    }
    return path.join(config.walkthroughRoot, ...segments, `${id.name}.json`)
  }

  // A single segment, checked rather than joined-and-resolved: a plan name has
  // no reason to contain a slash, so the narrowest rule is the safest one.
  if (!PLAN_NAME_PATTERN.test(id.name)) {
    throw new StorageError(
      `"${id.name}" is not a plan name. Use a short kebab-case name, for example resolve-refs-in-worktree.`,
    )
  }
  return path.join(config.planRoot, ...segments, `${id.name}.json`)
}
