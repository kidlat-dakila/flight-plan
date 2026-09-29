import { z } from "zod"
import { PLAN_NAME_PATTERN, REPO_PATTERN } from "./contract"
import type { WalkthroughKey } from "./storage"

/**
 * Which flight plan a call is about, as one string.
 *
 * Every tool but `start` used to carry five fields for this — a repository, a
 * kind, a pull request number, a branch and a plan name — with rules about
 * which combinations were legal and a refusal for the rest. A walkthrough takes
 * scores of calls to write, so that is five chances to get it wrong, scored
 * dozens of times, to say a thing that never changes inside one piece of work.
 *
 * So it is minted once and passed back. `start` returns it, and everything else
 * takes it and nothing else.
 *
 * **Readable rather than opaque, and derivable rather than looked up.** An
 * agent resuming work it did not start needs to name the document without a
 * round trip, and a random token would mean a lookup tool existing for no other
 * reason. So the form is written down and stable:
 *
 * ```
 * review:acme/storefront#412          a pull request
 * review:acme/storefront@release/4.2  a branch, which may contain slashes
 * create:acme/storefront@add-levels   a plan, which is named rather than found
 * ```
 *
 * The separators are safe because a repository cannot contain them: the pattern
 * the document schema enforces allows letters, digits, dot, dash, underscore
 * and slash, so the first `#` or `@` after the kind is always where the
 * repository ends — whatever the branch after it contains.
 */

export type PlanKind = "review" | "create"

export type PlanTarget =
  | { kind: "review"; repo: string; key: WalkthroughKey }
  | { kind: "create"; repo: string; name: string }

export const PLAN_DESCRIPTION =
  "Which flight plan this is about, as `start` returned it: " +
  "`review:owner/repo#412` for a pull request, `review:owner/repo@branch-name` " +
  "for a branch, or `create:owner/repo@plan-name` for a plan."

export const planRef = z.string().min(1).describe(PLAN_DESCRIPTION)

/** The string for a target, which is the only place the form is written. */
export function planIdOf(target: PlanTarget): string {
  if (target.kind === "create") return `create:${target.repo}@${target.name}`
  return target.key.kind === "pr"
    ? `review:${target.repo}#${String(target.key.number)}`
    : `review:${target.repo}@${target.key.name}`
}

/**
 * The target a string names, or a refusal that says what the form is.
 *
 * Refused rather than guessed at every step. A malformed reference that
 * resolved to *something* would write a document under a name nobody can find
 * again, which is the failure the panel meets rather than the agent.
 */
export function planTargetOf(ref: string): PlanTarget {
  const colon = ref.indexOf(":")
  if (colon === -1) {
    throw new Error(
      `\`${ref}\` is not a flight plan reference. ${PLAN_DESCRIPTION} It is returned by start; do not compose one from parts you have not seen.`,
    )
  }

  const kind = ref.slice(0, colon)
  if (kind !== "review" && kind !== "create") {
    throw new Error(
      `\`${kind}\` is not a kind of flight plan. It is \`review\` for a change that exists, or \`create\` for a plan of code that does not.`,
    )
  }

  const rest = ref.slice(colon + 1)
  const hash = rest.indexOf("#")
  const at = rest.indexOf("@")
  // Whichever comes first ends the repository. A repository can hold neither,
  // so this cannot be fooled by a branch that holds both.
  const cut =
    hash === -1 ? at : at === -1 ? hash : Math.min(hash, at)
  if (cut <= 0) {
    throw new Error(
      `\`${ref}\` names a repository and nothing else. ${PLAN_DESCRIPTION}`,
    )
  }

  const repo = rest.slice(0, cut)
  if (!REPO_PATTERN.test(repo)) {
    throw new Error(
      `\`${repo}\` is not a repository. It is owner/repo, for example acme/storefront; a nested group keeps its whole path.`,
    )
  }

  const tail = rest.slice(cut + 1)
  if (tail === "") {
    throw new Error(
      `\`${ref}\` ends with its separator and names nothing after it. ${PLAN_DESCRIPTION}`,
    )
  }

  if (kind === "create") {
    if (rest[cut] === "#") {
      throw new Error(
        "A plan is named, not numbered: `create:owner/repo@plan-name`. A `#` names a pull request, which a plan does not have.",
      )
    }
    if (!PLAN_NAME_PATTERN.test(tail)) {
      throw new Error(
        `\`${tail}\` is not a plan name. Use a short kebab-case name, for example resolve-refs-in-worktree.`,
      )
    }
    return { kind: "create", repo, name: tail }
  }

  if (rest[cut] === "#") {
    if (!/^[0-9]+$/.test(tail)) {
      throw new Error(
        `\`${tail}\` is not a pull request number. Use \`@\` for a branch: review:${repo}@${tail}`,
      )
    }
    const number = Number(tail)
    if (number <= 0) {
      throw new Error(`Pull request numbers start at 1; \`${ref}\` names ${String(number)}.`)
    }
    return { kind: "review", repo, key: { kind: "pr", number } }
  }

  return { kind: "review", repo, key: { kind: "branch", name: tail } }
}
