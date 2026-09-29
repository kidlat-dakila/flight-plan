import type { TargetRef } from "../lib/git-adapter/types"
import { planIdOf } from "../api/mcp/identity"
import { mcpReference } from "../lib/schemas/reference"

/**
 * The text the walkthrough panel's title bar puts on the clipboard.
 *
 * Nothing here sends anything anywhere. An earlier version tried
 * `claude-vscode.newConversation` with a `prompt` argument: the command exists,
 * the argument is undocumented and is ignored, so the button opened an empty
 * chat and left the user to work out what to type. A false affordance is worse
 * than no affordance.
 *
 * Copying also stops this being Claude-only. The same text pastes into whichever
 * assistant the reader uses, which is how the rest of setup treats agents.
 */

/** What the two prompt buttons copy, for one document. */
export type Prompts = { update: string; regenerate: string }

/**
 * A reference to the document the panel is showing, for example
 * `[mcp:read] create:owner/repo@mcp-consumer-guide-tool`.
 *
 * The same shape as the reference a prose selection produces, minus the
 * waypoint and the quote: this one names the whole document, so an assistant
 * asked about it fetches all of it. Both use `mcpReference`.
 */
export function documentReference(planRef: string, toolHint: string): string {
  return mcpReference(planRef, toolHint)
}

/**
 * The prompt that asks an assistant to write a walkthrough for a pull request
 * that has none.
 *
 * The skill's first call, `start`, opens the panel. Saying it here too is for
 * the reader more than the assistant: a prompt that says a panel will open sets
 * the expectation, so nothing looks broken when one does.
 */
export function generationPrompt(repo: string, ref: TargetRef): string {
  return `${reviewTarget(repo, ref)}\n${OPENS_ON_START}`
}

/** What every walkthrough prompt promises about the panel. */
const OPENS_ON_START = `start opens it here, so I can read it as you write it.`

/**
 * How a change is named to the skill.
 *
 * A pull request has a number and a branch has only its name, and the
 * difference has to reach the skill: told `owner/repo#12` for a branch, it goes
 * looking for a pull request that does not exist and reports the repository as
 * broken.
 */
export function reviewTarget(repo: string, ref: TargetRef): string {
  return ref.kind === "pr"
    ? `/flightplan:review ${repo}#${String(ref.number)}`
    : `/flightplan:review ${repo} on branch ${ref.name}, which has no pull request`
}

/**
 * The prompts for a pull request walkthrough that already exists.
 *
 * There is one skill for reviewing a pull request, and these carry what to do
 * with the walkthrough it already has. That is deliberate: a second skill for
 * refreshing was a second copy of the whole format to keep in step with the
 * first, and the only thing it really added was an instruction. So the
 * instruction lives here, where the button is.
 *
 * Both spell out how to store, because the two are genuinely different jobs.
 * Refreshing amends what is there, section by section; starting over discards
 * it, which `start` will only do when given `reset` — and that refusal is the
 * thing standing between a reviewed walkthrough and somebody's habit of
 * starting again.
 *
 * The overrides are explicit because preserving what a person wrote is the
 * default. Discarding it has to be asked for in as many words, by the user:
 * nothing here decides on its own that existing prose is worth throwing away.
 */
export function walkthroughPrompts(repo: string, ref: TargetRef): Prompts {
  /*
   * A change is named however it can be named. A pull request has a number;
   * a branch reviewed with plain git has only its name, and the skill has to be
   * told which one it is or it will go looking for a pull request that does not
   * exist.
   */
  const target = reviewTarget(repo, ref)
  return {
    update:
      `${target}\n` +
      `Refresh the existing walkthrough rather than writing a new one: read it ` +
      `with read (section full) first, keep the parts I have edited, check every ` +
      `range again against the current head, and put back only what changed ` +
      `with update-document and update-nodes. Make the smallest set of edits ` +
      `that makes it true, then call complete.`,
    regenerate:
      `${target}\n` +
      `Start over: discard the existing walkthrough and write a new one from ` +
      `scratch, rather than editing what is there. Call start with reset, then ` +
      `build it up and call complete. ${OPENS_ON_START}`,
  }
}

/**
 * The prompts for an implementation plan.
 *
 * There is no plan skill, so the prompt names the Flight Plan MCP tools
 * directly. `get-instructions` comes first because it is where the writing
 * rules live now that no skill carries them. `update-plan` stores the result
 * in both cases: it creates a plan or replaces the one with that name.
 *
 * Every prompt re-states the working tree, because a plan's positions resolve
 * against the current branch as it stands right now. A plan updated against
 * `HEAD` proposes code at lines that have already moved.
 */
export function planPrompts(repo: string, name: string): Prompts {
  const target =
    `Use the Flight Plan MCP tools on the plan "${name}" for ${repo} ` +
    `(${planIdOf({ kind: "create", repo, name })}). Call get-instructions first.`
  const open = `Then open it with open-plan so I can read it here.`
  return {
    update:
      `${target}\n` +
      `Update the existing plan rather than writing a new one: read it with read ` +
      `first, keep the parts I have edited by hand, check every proposed ` +
      `position again against the working tree on the current branch, and store it ` +
      `with update-plan. ${open}`,
    regenerate:
      `${target}\n` +
      `Write the plan again from scratch: ignore what is stored rather than ` +
      `editing it, work the change out again against the working tree on the ` +
      `current branch, and store it with update-plan. ${open}`,
  }
}
