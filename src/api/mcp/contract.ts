/**
 * The MCP tool contract.
 *
 * Two products: walkthroughs and plans. `TOOL_NAMES` is the list of what the
 * server offers, and it is checked against what the server actually registers
 * rather than maintained by hand — a list nothing verifies is a list that goes
 * stale, and this one had: six tools were registered and unlisted before
 * anything compared them. The reference format the renderer copies names
 * `read` (`[mcp:read] review:owner/repo#412@waypoint`) in text an agent reads,
 * which is why it is fixed and not up for revision.
 *
 * Two rules shape every signature here.
 *
 * **No tool takes or returns a filesystem path.** The agent must not learn where
 * walkthroughs and plans are stored, because MCP is meant to be the only way
 * to change them. Identity is by subject instead: a walkthrough is a
 * repository and a pull request number or branch, a plan is a repository and
 * a name.
 *
 * **Opening is asked for, not done.** The `open-*` tools return as soon as the
 * request is on its way and say so honestly: the server cannot know whether a
 * window acted on it, and waiting for one that may not exist would stall the
 * agent for nothing.
 *
 * **A document is always JSON, and never sent as Markdown.** Every write takes
 * the JSON document itself; there is no Markdown form to send.
 */

export const TOOL_NAMES = [
  /*
   * A flight plan, start to finish.
   *
   * Six verbs where there were sixteen, and the reduction is not the point —
   * what the agent no longer does is. `start` scaffolds and waits, so there is
   * nothing to poll. `read` and `nodes` hand over the change and the worklist
   * with the covered code already attached, so there is no reason to run `git`.
   * `complete` refuses with the same list `nodes` hands out, so finishing and
   * being told what is left cannot disagree.
   */
  "start",
  "read",
  "nodes",
  "update-document",
  "update-nodes",
  "complete",
  /*
   * A plan, which is written whole rather than filled in.
   *
   * Nothing scaffolds a plan: its code does not exist yet, so there is no diff
   * to derive a structure from and no ids to write prose onto. The six above
   * are built on a scaffold handing the agent a list of gaps, and a document
   * with no scaffold has no gaps — so a plan keeps a whole-document write, and
   * `read` is what it shares. One write, `update-plan`, which creates a plan or
   * replaces it.
   */
  "update-plan",
  "list-plans",
  "open-plan",
  /*
   * User configuration, read before writing.
   *
   * `get-instructions` hands the agent the active profile's guidance — how to
   * write each field, and which artifact bodies the user turned off — so the
   * prose that steers a document is the user's live choice, not frozen skill
   * text.
   */
  "get-instructions",
] as const

export type ToolName = (typeof TOOL_NAMES)[number]

/**
 * `owner/repo`, the only repository form the tools accept.
 *
 * Declared in the renderer package, which is also where the document schema
 * checks it. Two copies of that regex would be two answers to "is this a
 * repository", and the tools and the schema must not disagree.
 */
export { REPO_PATTERN } from "../../lib/schemas/document/primitives"

export const REPO_DESCRIPTION =
  "Repository as owner/repo, for example acme/storefront. A GitLab project in " +
  "a nested group keeps its whole path, for example group/subgroup/project."

/**
 * A branch, for a change that has no pull request.
 *
 * Given instead of a pull request number, never as well. Somebody working with
 * plain git has no pull requests at all, and a walkthrough written for them has
 * to be filed under something; the branch is the only name the change has.
 */
export const BRANCH_DESCRIPTION =
  "Branch name, for a change with no pull request yet. Give this or a pull " +
  "request number, not both."

/**
 * A plan's name, which is also its identity.
 *
 * One path segment, so it cannot address anything but a plan. Plans are not
 * keyed by branch even though they are read against one: branches get renamed
 * and deleted, and a plan usually outlives the first branch someone tries it
 * on. The branch it was written against goes in `meta.branch`, where it is a
 * note rather than a filename.
 */
export const PLAN_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/

export const PLAN_NAME_DESCRIPTION =
  "Short kebab-case name for the plan, for example resolve-refs-in-worktree. " +
  "Letters, digits, dot, dash and underscore only."

export const PLAN_DOCUMENT_DESCRIPTION =
  "The complete plan as a JSON object, the same shape a walkthrough takes, " +
  'with meta.kind "plan" and no head. Every waypoint proposes code, and ' +
  "positions resolve against the working tree on the current branch."
