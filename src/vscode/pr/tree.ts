import * as vscode from "vscode"
import { resolveGitAdapter } from "../git-adapter/resolve"
import {
  GitAdapterError,
  refKey,
  type GitAdapter,
  type GitAdapterProblem,
  type ReviewTarget,
  type TargetRef,
} from "../../lib/git-adapter/types"
import type { WalkthroughKey } from "../../api/mcp/storage"
import { Filters, Pins } from "./listState"
import { YOU, describeRow, groupByAuthor } from "../utils/prGrouping"

/**
 * The review list, in the Source Control view.
 *
 * Beside Changes and Graph rather than in a container of its own, because it
 * belongs to the same activity: this is the repository you are working in, and
 * these are the changes under review in it. A separate icon in the activity bar
 * would be a third home for something that already has one.
 *
 * The list is a way into a **walkthrough**, not a way into a diff. That is the
 * whole difference from the GitHub Pull Requests extension, and it is why the
 * only status this view tracks is whether a walkthrough exists.
 *
 * What it lists depends on the adapter. Every host with pull requests answers
 * "which ones are under review"; plain git cannot, because nothing local knows,
 * so its rows are the branches somebody named. The view does not special-case
 * either: it asks the adapter, and reads its capabilities to decide what to offer
 * beyond that.
 */

/** Whether a walkthrough is stored for a change on this machine. */
type Walkthrough = "unknown" | "checking" | "present" | "absent" | "error"

type Row = { target: ReviewTarget; walkthrough: Walkthrough }

/**
 * An author, when the view is grouped.
 *
 * The same shape the plans view uses for a branch, and grouped the same way:
 * a toggle in the title, a preference in global state, and no reload, because
 * grouping arranges rows the view already has.
 */
type Group = { kind: "group"; author: string; mine: boolean; rows: Row[] }

type Node = Row | Group | string

/** Where the group-by-author toggle is remembered. */
const GROUP_KEY = "flightPlan.pullRequests.groupByAuthor"

/**
 * Why the list is empty, published as a context key.
 *
 * The view used to answer every one of these with a tree row holding a
 * sentence, which is the wrong shape twice over: a row looks clickable and is
 * not, and a sentence cannot carry the thing the reader actually needs, which
 * is a link to the fix. These drive `viewsWelcome` entries in the manifest
 * instead, so each state gets its own prose and its own buttons.
 *
 * Deliberately free of hyphens. A `when` clause compares against a bare word,
 * and `flightPlan.prs == no-cli` invites the parser to read the value as an
 * expression.
 */
type Emptiness =
  | "loading"
  | "noFolder"
  | "empty"
  /** Plain git, with no branches added yet. Not a failure; a different list. */
  | "gitOnly"
  | "noCli"
  | "auth"
  | "noRepo"
  | "hostMismatch"
  | "error"

function emptinessOf(problem: GitAdapterProblem): Emptiness {
  switch (problem) {
    case "no-cli":
      return "noCli"
    case "auth":
      return "auth"
    case "no-repo":
      return "noRepo"
    case "host-mismatch":
      return "hostMismatch"
    default:
      return "error"
  }
}

/** A ref as the storage layer keys a walkthrough. */
function storageKey(ref: TargetRef): WalkthroughKey {
  return ref.kind === "pr"
    ? { kind: "pr", number: ref.number }
    : { kind: "branch", name: ref.name }
}

export class PullRequestTree implements vscode.TreeDataProvider<Node> {
  /** Set by the extension, so the tree can read storage without importing setup. */
  static storedReader:
    | ((repo: string, ref: WalkthroughKey) => Promise<string | null>)
    | null = null

  private readonly changed = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.changed.event

  private rows: Row[] = []
  /**
   * The verbatim text of a failure nothing else explains.
   *
   * Only the `error` state uses it. The named states say more than the
   * exception does, and a welcome view cannot interpolate a string, so this is
   * the one case that still renders as a row.
   */
  private message: string | null = null
  private loading = false
  private repo = ""

  /**
   * The adapter the last load resolved, or null when it could not be built.
   *
   * Held so the commands can read its capabilities without resolving it again,
   * and so a button can explain itself rather than failing. Refreshed on every
   * load, because the choice is a setting somebody can change while the window
   * is open.
   */
  private currentGitAdapter: GitAdapter | null = null

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly folder: () => string | undefined,
    private readonly pins: Pins,
    private readonly filters: Filters,
  ) {
    // Published before the first load, or the title would show both toggles
    // until something else set the key.
    this.publishGrouped()
  }

  /** The repository this list is showing, or "" before that is known. */
  repository(): string {
    return this.repo
  }

  /** The adapter behind the list, for a command that has to ask what it can do. */
  gitAdapter(): GitAdapter | null {
    return this.currentGitAdapter
  }

  refresh(): void {
    void this.load()
  }

  /** Whether the list is grouped by author. */
  private get grouped(): boolean {
    return this.context.globalState.get<boolean>(GROUP_KEY) ?? false
  }

  /**
   * Whether grouping by author is worth offering at all.
   *
   * Only on a host that can enumerate review targets. Plain git cannot, so its
   * rows are the branches somebody named by hand — usually their own, and never
   * a queue of other people's work. Grouping those by author would file a short
   * list of your own branches under your own name.
   *
   * `list` rather than an author field, because the author is not the missing
   * part: a branch has one, the tip commit's. What is missing is anybody else's
   * work to separate yours from.
   */
  private get canGroup(): boolean {
    return this.currentGitAdapter?.supports("list") ?? false
  }

  /**
   * Turns grouping on or off, and redraws.
   *
   * No reload: grouping is a way of arranging rows already in hand, and asking
   * the adapter again would spend a network round trip on a question whose answer
   * has not changed.
   */
  async setGrouped(grouped: boolean): Promise<void> {
    await this.context.globalState.update(GROUP_KEY, grouped)
    this.publishGrouped()
    this.changed.fire()
  }

  /**
   * So the manifest can show whichever toggle applies, or neither.
   *
   * Two keys: whether grouping is on, and whether it is offered. A host that
   * cannot list shows no toggle, rather than one that explains itself when
   * clicked — the pattern the filter buttons follow. A filter refused by the
   * host has a way out to offer, which is the setup panel; this has none,
   * because nothing about the repository would make grouping mean something.
   */
  publishGrouped(): void {
    void vscode.commands.executeCommand(
      "setContext",
      "flightPlan.prsGrouped",
      this.grouped,
    )
    void vscode.commands.executeCommand(
      "setContext",
      "flightPlan.prsCanGroup",
      this.canGroup,
    )
  }

  /** Says why the list is empty, so the manifest can pick what to show. */
  private setEmptiness(state: Emptiness | null): void {
    void vscode.commands.executeCommand("setContext", "flightPlan.prs", state)
  }

  /** The change behind a tree row, for the open command. */
  static targetOf(row: Node): ReviewTarget | null {
    if (typeof row === "string") return null
    return "kind" in row ? null : row.target
  }

  private async load(): Promise<void> {
    const cwd = this.folder()
    if (cwd === undefined) {
      this.rows = []
      this.message = null
      this.currentGitAdapter = null
      this.publishGrouped()
      this.setEmptiness("noFolder")
      this.changed.fire()
      return
    }

    this.loading = true
    this.message = null
    this.setEmptiness("loading")
    this.changed.fire()

    const config = vscode.workspace.getConfiguration("flightPlan")

    try {
      const resolved = await resolveGitAdapter(this.context, cwd)
      this.repo = resolved.repo
      if (!resolved.ok) {
        this.currentGitAdapter = null
        this.publishGrouped()
        this.rows = []
        this.setEmptiness(emptinessOf(resolved.error.problem))
        this.message =
          emptinessOf(resolved.error.problem) === "error"
            ? resolved.error.message
            : null
        return
      }

      const gitAdapter = resolved.gitAdapter
      this.currentGitAdapter = gitAdapter
      this.publishGrouped()

      const targets = await gitAdapter.listTargets({
        query: config.get<string>("pullRequestQuery"),
        filter: this.filters.filter(),
        includeMine: this.filters.includeMine(),
        pinned: this.pins.list(this.repo),
        limit: config.get<number>("pullRequestLimit") ?? 30,
      })
      this.rows = targets.map((target) => ({ target, walkthrough: "unknown" }))
      this.setEmptiness(
        targets.length > 0
          ? null
          : // Nothing to show is a different fact on a gitAdapter that cannot search.
            // "There are none open" would be a claim git is in no position to
            // make, and the fix it needs is a different one.
            gitAdapter.supports("list")
            ? "empty"
            : "gitOnly",
      )
    } catch (cause) {
      this.rows = []
      const state =
        cause instanceof GitAdapterError ? emptinessOf(cause.problem) : "error"
      this.setEmptiness(state)
      // Kept only for the state that has nothing better to say. The named ones
      // explain themselves in the manifest, in more words than an exception
      // ever manages.
      this.message =
        state !== "error"
          ? null
          : cause instanceof Error
            ? cause.message
            : String(cause)
    } finally {
      this.loading = false
      this.changed.fire()
    }

    if (this.currentGitAdapter !== null) {
      void this.checkWalkthroughs(this.repo)
    }
  }

  /**
   * Fills in which changes already have a walkthrough.
   *
   * One read of local storage per row, in the background and after the list
   * is on screen: the list is what the reader came for, and the badges can
   * arrive after it.
   */
  private async checkWalkthroughs(repo: string): Promise<void> {
    const queue = [...this.rows]
    const workers = Array.from({ length: 4 }, async () => {
      for (;;) {
        const row = queue.shift()
        if (row === undefined) return
        row.walkthrough = "checking"
        try {
          const stored =
            repo === ""
              ? null
              : await PullRequestTree.storedReader?.(repo, storageKey(row.target.ref))
          row.walkthrough = stored === null || stored === undefined ? "absent" : "present"
        } catch {
          // A single unreadable change should not blank the row; the open
          // command will report the real error if the user goes there.
          row.walkthrough = "error"
        }
        this.changed.fire()
      }
    })
    await Promise.all(workers)
  }

  getTreeItem(row: Node): vscode.TreeItem {
    if (typeof row !== "string" && "kind" in row) {
      const item = new vscode.TreeItem(
        row.mine ? YOU : row.author,
        vscode.TreeItemCollapsibleState.Expanded,
      )
      const count = row.rows.length
      item.description = `${String(count)} change${count === 1 ? "" : "s"}`
      // `account` for your own, the same icon the "include your own" filter
      // uses, so the two say the same thing in the same way.
      item.iconPath = new vscode.ThemeIcon(row.mine ? "account" : "person")
      item.contextValue = "flightPlan.prAuthor"
      item.id = `${this.repo}:author:${row.author}`
      return item
    }

    if (typeof row === "string") {
      const item = new vscode.TreeItem(row)
      item.contextValue = "flightPlan.message"
      // The only string row left that is not "Loading…" is a failure nothing
      // could name, and it should not look like something to click.
      if (row === this.message) {
        item.iconPath = new vscode.ThemeIcon("warning")
        item.tooltip = new vscode.MarkdownString(
          `Flight Plan could not list anything to review.\n\n\`\`\`\n${row}\n\`\`\``,
        )
      }
      return item
    }

    const { target } = row
    const item = new vscode.TreeItem(
      target.ref.kind === "pr"
        ? `#${String(target.ref.number)} ${target.title}`
        : `${target.ref.name} — ${target.title}`,
      vscode.TreeItemCollapsibleState.None,
    )
    // Grouped, the author is the parent's label, so repeating it in every row
    // spends the description on the one thing already on screen.
    item.description = describeRow(
      { ...row.target, walkthrough: row.walkthrough },
      this.grouped,
    )
    item.tooltip = new vscode.MarkdownString(
      `**${target.title}**\n\nby ${target.author}\n\n${tooltipFor(row.walkthrough)}`,
    )
    item.iconPath = iconFor(row)
    // Four values rather than two, because unpinning belongs only on a pinned
    // row and a `when` clause can only match the whole string.
    const pinned =
      target.reason === "pinned" || target.reason === "added" ? ".pinned" : ""
    item.contextValue =
      row.walkthrough === "present"
        ? `flightPlan.pr.withWalkthrough${pinned}`
        : `flightPlan.pr${pinned}`
    item.command = {
      command: "flightPlan.openPullRequest",
      title: "Open walkthrough",
      arguments: [target],
    }
    item.id = `${this.repo}:${refKey(target.ref)}`
    return item
  }

  getChildren(node?: Node): Node[] {
    if (node !== undefined) {
      return typeof node !== "string" && "kind" in node ? node.rows : []
    }
    if (this.loading && this.rows.length === 0) return ["Loading…"]
    if (this.message !== null) return [this.message]
    // Empty, so whichever `viewsWelcome` entry matches `flightPlan.prs` shows.
    if (!this.grouped || !this.canGroup) return this.rows
    return groupByAuthor(
      this.rows.map((row) => ({ ...row, author: row.target.author, reason: row.target.reason })),
    ).map((group) => ({
      kind: "group" as const,
      author: group.author,
      mine: group.mine,
      rows: group.rows.map(({ target, walkthrough }) => ({ target, walkthrough })),
    }))
  }
}

function tooltipFor(walkthrough: Walkthrough): string {
  switch (walkthrough) {
    case "present":
      return "Has a walkthrough. Open it to read the change in order."
    case "absent":
      return "No walkthrough yet. Opening it offers to generate one."
    case "error":
      return "Its stored walkthrough could not be read."
    default:
      return "Checking whether it has a walkthrough…"
  }
}

function iconFor(row: Row): vscode.ThemeIcon {
  if (row.walkthrough === "present") {
    return new vscode.ThemeIcon("book", new vscode.ThemeColor("charts.green"))
  }
  if (row.walkthrough === "error") return new vscode.ThemeIcon("warning")
  // A branch is not a pull request and should not borrow its icon.
  if (row.target.ref.kind === "branch") return new vscode.ThemeIcon("git-branch")
  // A change in the list because somebody named it is a different fact from
  // either of the others and outranks them.
  if (row.target.reason === "pinned") return new vscode.ThemeIcon("pin")
  // One awaiting your review reads differently from one of your own, and that
  // distinction is the reason the list exists.
  return new vscode.ThemeIcon(
    row.target.reason === "review-requested" ? "eye" : "git-pull-request",
  )
}
