import * as vscode from "vscode"
import { parseBranchName, parsePullRequestRef } from "../utils/refs"
import type { Filters, Pins } from "./listState"
import type { Capability, GitAdapter } from "../../lib/git-adapter/types"

/**
 * The four ways a reader changes what the pull request list contains.
 *
 * Each is its own command with its own button, rather than one wizard asking
 * three questions in a row. Somebody who wants to add a label is answering one
 * question, and making them walk past the other two to reach it is how a
 * filter becomes something people set once and never touch again.
 *
 * The answers live in workspace state rather than settings, so choosing a
 * filter never writes to `.vscode/settings.json` and never turns one person's
 * review queue into a file the whole team pulls.
 */

/**
 * Refuses a button the configured adapter cannot answer, and offers the fix.
 *
 * A toast rather than a silent no-op, and it carries the way out: somebody who
 * clicked "filter by review" wants to filter by review, and telling them it is
 * unavailable without saying what would make it available leaves them to guess
 * that the answer is in a setup panel they may never have opened.
 *
 * Returns whether the caller may proceed, so every command reads the same way.
 */
export async function requireCapability(
  gitAdapter: GitAdapter | null,
  capability: Capability,
  what: string,
): Promise<boolean> {
  if (gitAdapter !== null && gitAdapter.supports(capability)) return true

  const using = gitAdapter === null ? "Flight Plan" : `Flight Plan with ${gitAdapter.name}`
  const choice = await vscode.window.showWarningMessage(
    `${using} cannot ${what}. Choose how Flight Plan reaches your code host to ` +
      `turn this on.`,
    "Open setup",
  )
  if (choice !== undefined) {
    await vscode.commands.executeCommand("flightPlan.openSetup")
  }
  return false
}

/**
 * Warns when the deprecated free-text search is making these buttons useless.
 *
 * It outranks every filter, so leaving it set means answering a question and
 * watching the list not change, which reads as the feature being broken. Not
 * cleared automatically: it lives in settings, which is a file somebody chose
 * to write, and silently editing it is not this command's business.
 */
function warnAboutLegacyQuery(): void {
  const config = vscode.workspace.getConfiguration("flightPlan")
  if ((config.get<string>("pullRequestQuery") ?? "").trim() === "") return
  void vscode.window
    .showWarningMessage(
      "`flightPlan.pullRequestQuery` is set, and it overrides these filters.",
      "Clear it",
    )
    .then(async (choice) => {
      if (choice === undefined) return
      await config.update("pullRequestQuery", "", vscode.ConfigurationTarget.Workspace)
    })
}

/**
 * Which review states to ask the host about.
 *
 * The options come from the adapter rather than from a fixed list, because they
 * do not translate. GitHub's `review:changes_requested` has no GitLab
 * equivalent, GitLab's approval rules have no GitHub one, and Bitbucket's query
 * language expresses almost none of it. A fixed list would show every reader a
 * picker of options that quietly do nothing on their host.
 */
export async function filterByReview(
  filters: Filters,
  gitAdapter: GitAdapter | null,
): Promise<boolean> {
  if (!(await requireCapability(gitAdapter, "filters", "filter by review state"))) {
    return false
  }
  const options = gitAdapter?.reviewFilters() ?? []
  if (options.length === 0) {
    void vscode.window.showInformationMessage(
      `${gitAdapter?.name ?? "This host"} offers no review filters.`,
    )
    return false
  }

  const current = filters.filter().review
  const picked = await vscode.window.showQuickPick(
    options.map((option) => ({
      label: option.label,
      key: option.key,
      picked: current.includes(option.key),
    })),
    {
      title: "Review",
      placeHolder: "Pick none for any review state. Several have to all be true.",
      canPickMany: true,
      ignoreFocusOut: true,
    },
  )
  if (picked === undefined) return false

  await filters.setReview(picked.map((item) => item.key))
  warnAboutLegacyQuery()
  return true
}

/**
 * Which labels a pull request has to carry.
 *
 * Offered from the repository when `gh` can list them, because remembering the
 * exact spelling of a label is not something anybody should have to do, and a
 * typo returns an empty list rather than an error. Typing is the fallback and
 * is reached only when that call fails.
 */
export async function filterByLabel(
  filters: Filters,
  cwd: string | undefined,
  gitAdapter: GitAdapter | null,
): Promise<boolean> {
  if (cwd === undefined) {
    void vscode.window.showInformationMessage(
      "Open the repository folder to filter by label.",
    )
    return false
  }
  if (!(await requireCapability(gitAdapter, "labels", "filter by label"))) return false

  const current = [...filters.filter().labels]

  let available: string[]
  try {
    available = await (gitAdapter as GitAdapter).listLabels()
  } catch {
    const typed = await vscode.window.showInputBox({
      title: "Labels",
      prompt: "Labels to filter by, separated by commas. Leave empty for any.",
      value: current.join(", "),
      ignoreFocusOut: true,
    })
    if (typed === undefined) return false
    await filters.setLabels(
      typed
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label !== ""),
    )
    warnAboutLegacyQuery()
    return true
  }

  // A label that is set but no longer defined still has to be offered, or
  // opening the picker would quietly drop it.
  const names = [...new Set([...available, ...current])].sort((a, b) =>
    a.localeCompare(b),
  )
  const picked = await vscode.window.showQuickPick(
    names.map((name) => ({ label: name, picked: current.includes(name) })),
    {
      title: "Labels",
      placeHolder: "Every label picked has to be on the pull request. None means any.",
      canPickMany: true,
      ignoreFocusOut: true,
    },
  )
  if (picked === undefined) return false

  await filters.setLabels(picked.map((item) => item.label))
  warnAboutLegacyQuery()
  return true
}

/** Whether pull requests you opened are listed as well. */
export async function filterMyPullRequests(
  filters: Filters,
  gitAdapter: GitAdapter | null,
): Promise<boolean> {
  if (!(await requireCapability(gitAdapter, "list", "list your own changes"))) {
    return false
  }
  const current = filters.includeMine()
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: "Yes",
        detail: "List pull requests you opened as well as the ones above",
        value: true,
        picked: current,
      },
      {
        label: "No",
        detail: "Only the ones the review and label filters match",
        value: false,
        picked: !current,
      },
    ],
    {
      title: "Include your pull requests",
      placeHolder: current ? "Currently yes" : "Currently no",
      ignoreFocusOut: true,
    },
  )
  if (picked === undefined) return false

  await filters.setIncludeMine(picked.value)
  warnAboutLegacyQuery()
  return true
}

/**
 * Adds a change to the list by hand, whatever the filters say.
 *
 * Two questions, not one, because the two adapters are asking for different
 * things. A host with pull requests takes a link: the whole point is that a
 * colleague sent you one and it is not in your queue. Plain git has no pull
 * requests, so the only name a change has is its branch, and asking for a link
 * would be asking for something that does not exist.
 *
 * Both validate while they are typed rather than after they are submitted, so a
 * link from the wrong repository or a branch name git would refuse is caught
 * with the cursor still in the box. The alternative is a notification that
 * arrives once the box has closed and taken the text with it.
 */
export async function addPullRequest(
  pins: Pins,
  repo: string,
  gitAdapter: GitAdapter | null,
  refresh: () => void,
): Promise<void> {
  if (gitAdapter !== null && !gitAdapter.supports("list")) {
    await addBranch(pins, repo, gitAdapter, refresh)
    return
  }

  const pasted = await vscode.window.showInputBox({
    title: "Add a pull request",
    prompt: `Paste a link to a pull request in ${repo === "" ? "this repository" : repo}`,
    placeHolder: "https://github.com/owner/repo/pull/123",
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (value.trim() === "") return undefined
      const parsed = parsePullRequestRef(value, repo)
      return parsed.ok ? undefined : parsed.reason
    },
  })
  if (pasted === undefined || pasted.trim() === "") return

  const parsed = parsePullRequestRef(pasted, repo)
  // Re-read rather than trusted: the box accepts an empty string, and nothing
  // stops the value changing between the last validation and submission.
  if (!parsed.ok) {
    void vscode.window.showWarningMessage(parsed.reason)
    return
  }

  await pins.add(repo, { kind: "pr", number: parsed.number })
  refresh()
}

/**
 * Adds a branch to the list, for a adapter with no pull requests.
 *
 * The branch has to exist in the checkout, and that is checked here rather than
 * left to the row: a name that resolves to nothing would be added, render as
 * nothing, and look like the panel losing it. Checking first means the refusal
 * names the actual problem, which is usually that the branch has not been
 * fetched.
 */
async function addBranch(
  pins: Pins,
  repo: string,
  gitAdapter: GitAdapter,
  refresh: () => void,
): Promise<void> {
  const typed = await vscode.window.showInputBox({
    title: "Add a branch to review",
    prompt:
      `Flight Plan is set to use ${gitAdapter.name}, which has no pull requests. ` +
      `Name a branch in this checkout instead.`,
    placeHolder: "stock-check",
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (value.trim() === "") return undefined
      const parsed = parseBranchName(value)
      return parsed.ok ? undefined : parsed.reason
    },
  })
  if (typed === undefined || typed.trim() === "") return

  const parsed = parseBranchName(typed)
  if (!parsed.ok) {
    void vscode.window.showWarningMessage(parsed.reason)
    return
  }
  const name = parsed.name

  const found = await gitAdapter.target({ kind: "branch", name }).catch(() => null)
  if (found === null) {
    const choice = await vscode.window.showWarningMessage(
      `${name} is not in this checkout. Fetch it first, then add it.`,
      "Fetch it",
    )
    if (choice !== undefined) {
      await vscode.commands.executeCommand("flightPlan.fetchBranch", name)
    }
    return
  }

  await pins.add(repo, { kind: "branch", name })
  refresh()
}
