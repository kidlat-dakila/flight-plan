import * as vscode from "vscode"
import { readConfig } from "../../api/mcp/config"
import { createStorage } from "../../api/mcp/storage"
import { locations } from "../setup"
import { repoName } from "../../utils/git-adapter/helpers/remote"
import {
  groupPlansByBranch,
  planSummaryOf,
  visiblePlans,
  NO_BRANCH,
  type PlanRow,
} from "../utils/planGrouping"

/**
 * The plans for this repository, in the Explorer.
 *
 * Not in Source Control, where the pull request list lives. That list belongs
 * there because a pull request *is* source control: a branch, a diff, a commit
 * to read the code at. A plan is none of those. It is about code that has not
 * been written, it is keyed by name rather than by branch, it needs no network,
 * and it resolves against the working tree — which is the Explorer's subject.
 *
 * The consequence is that the whole view is a directory listing, a read of
 * each plan's `title` and `meta.branch`, and one small sidecar file.
 */

/** Remembers the two view toggles, so the view opens as it was left. */
const GROUP_KEY = "flightPlan.plans.groupByBranch"
const ARCHIVED_KEY = "flightPlan.plans.showArchived"

type Row = PlanRow & { kind: "plan" }

/** A branch, when the view is grouped. */
type Group = { kind: "group"; branch: string | null; rows: Row[] }

/** A message where rows would be: loading, empty, or a failure. */
type Message = { kind: "message"; text: string }

type Node = Row | Group | Message

export class PlanTree implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.changed.event

  private rows: Row[] = []
  private message: string | null = null
  private loading = false

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly folder: () => string | undefined,
  ) {
    // Published before the first load, so the view's title buttons are correct
    // the moment it appears rather than after the first refresh.
    void this.publishModes()
  }

  refresh(): void {
    void this.load()
  }

  /** The plan behind a tree row, for the open and archive commands. */
  static planOf(node: Node): { name: string } | null {
    return node.kind === "plan" ? { name: node.name } : null
  }

  private get grouped(): boolean {
    return this.context.globalState.get<boolean>(GROUP_KEY) === true
  }

  private get showArchived(): boolean {
    return this.context.globalState.get<boolean>(ARCHIVED_KEY) === true
  }

  /**
   * Mirrors the toggles into context keys.
   *
   * The view's title shows "Group by branch" or "Show as a flat list", never
   * both, and a `when` clause is the only way to express that — a command
   * cannot change its own title.
   */
  private async publishModes(): Promise<void> {
    await vscode.commands.executeCommand(
      "setContext",
      "flightPlan.plansGrouped",
      this.grouped,
    )
    await vscode.commands.executeCommand(
      "setContext",
      "flightPlan.plansShowArchived",
      this.showArchived,
    )
  }

  async setGrouped(grouped: boolean): Promise<void> {
    await this.context.globalState.update(GROUP_KEY, grouped)
    await this.publishModes()
    // No reload: grouping is a way of arranging rows already in hand.
    this.changed.fire()
  }

  async setShowArchived(show: boolean): Promise<void> {
    await this.context.globalState.update(ARCHIVED_KEY, show)
    await this.publishModes()
    this.changed.fire()
  }

  /** Archives a plan, or brings it back, and reflects it in the view. */
  async setArchived(name: string, archived: boolean): Promise<void> {
    const cwd = this.folder()
    if (cwd === undefined) return
    const repo = await repoName(cwd)
    if (repo === null) return
    const storage = createStorage(await readConfig(locations(this.context).server))
    await storage.setPlanArchived(repo, name, archived)

    // Updated in place rather than reloaded: the answer is already known, and
    // a reload would cost another look at the remote to learn it again.
    const row = this.rows.find((candidate) => candidate.name === name)
    if (row !== undefined) row.archived = archived
    this.changed.fire()
  }

  /**
   * Says why the list is empty, so the manifest can pick what to show.
   *
   * Same arrangement as the pull request list: a tree row can hold a sentence
   * and cannot hold a link to the fix, and the states worth explaining all have
   * one. See `Emptiness` in `pr/tree.ts`.
   */
  private setEmptiness(state: "loading" | "noFolder" | "empty" | "noRepo" | "error" | null): void {
    void vscode.commands.executeCommand("setContext", "flightPlan.planList", state)
  }

  private async load(): Promise<void> {
    const cwd = this.folder()
    if (cwd === undefined) {
      this.rows = []
      this.message = null
      this.setEmptiness("noFolder")
      this.changed.fire()
      return
    }

    this.loading = true
    this.message = null
    this.setEmptiness("loading")
    this.changed.fire()

    try {
      const repo = await repoName(cwd)
      if (repo === null) {
        this.rows = []
        this.message = null
        this.setEmptiness("noRepo")
        return
      }
      const storage = createStorage(await readConfig(locations(this.context).server))
      const [names, archived] = await Promise.all([
        storage.listPlans(repo),
        storage.archivedPlans(repo),
      ])
      const archivedSet = new Set(archived)
      const rows = await Promise.all(
        names.map(async (name): Promise<Row> => {
          const summary = planSummaryOf((await storage.readPlan(repo, name)) ?? "")
          return {
            kind: "plan",
            name,
            // The title, since a name is a slug and a title is prose. Falls
            // back to the slug rather than to nothing.
            title: summary?.title ?? name,
            branch: summary?.branch ?? null,
            archived: archivedSet.has(name),
          }
        }),
      )
      // Storage lists oldest first, which is right for a listing and wrong for
      // this: the plan you just wrote is the one you want to open.
      this.rows = rows.reverse()
      this.message = null
      this.setEmptiness(rows.length === 0 ? "empty" : null)
    } catch (cause) {
      this.rows = []
      /*
       * Nothing here reaches a code host any more.
       *
       * Naming the repository used to shell out to `gh repo view`, so a machine
       * without the CLI could not list plans either and said
       * `Error: spawn gh ENOENT` about it — a message about GitHub, on a
       * feature that never touches GitHub. It now reads the git remote, which
       * answers with no CLI, no token and no network, and the only remaining
       * failures are storage ones.
       */
      this.setEmptiness("error")
      this.message = cause instanceof Error ? cause.message : String(cause)
    } finally {
      this.loading = false
      this.changed.fire()
    }
  }

  /** The rows the current toggles say to show. */
  private visible(): Row[] {
    return visiblePlans(this.rows, this.showArchived) as Row[]
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === "message") {
      const item = new vscode.TreeItem(node.text)
      item.contextValue = "flightPlan.message"
      return item
    }

    if (node.kind === "group") {
      const item = new vscode.TreeItem(
        node.branch ?? NO_BRANCH,
        vscode.TreeItemCollapsibleState.Expanded,
      )
      item.description = `${String(node.rows.length)} plan${node.rows.length === 1 ? "" : "s"}`
      item.iconPath = new vscode.ThemeIcon(
        node.branch === null ? "question" : "git-branch",
      )
      item.contextValue = "flightPlan.planGroup"
      return item
    }

    const item = new vscode.TreeItem(node.title, vscode.TreeItemCollapsibleState.None)
    // Grouped, the branch is already the parent's label, so the slug is the
    // more useful thing to show — it is what an agent is told to call it.
    item.description = this.grouped
      ? node.name
      : (node.branch ?? node.name)
    item.tooltip = new vscode.MarkdownString(
      `**${node.title}**\n\n\`${node.name}\`\n\n` +
        (node.branch === null
          ? "No branch recorded. It is read against whatever branch you are on."
          : `Written against \`${node.branch}\`. It is read against whatever branch you are on now.`) +
        (node.archived ? "\n\nArchived." : ""),
    )
    item.iconPath = new vscode.ThemeIcon(node.archived ? "archive" : "checklist")
    // The context value decides which of Archive and Unarchive the right-click
    // menu offers, so it has to distinguish the two states.
    item.contextValue = node.archived
      ? "flightPlan.plan.archived"
      : "flightPlan.plan"
    item.command = {
      command: "flightPlan.openPlan",
      title: "Open plan",
      arguments: [{ name: node.name }],
    }
    return item
  }

  getChildren(node?: Node): Node[] {
    if (node !== undefined) {
      return node.kind === "group" ? node.rows : []
    }

    if (this.loading && this.rows.length === 0) {
      return [{ kind: "message", text: "Loading…" }]
    }
    if (this.message !== null) return [{ kind: "message", text: this.message }]

    const rows = this.visible()
    if (rows.length === 0) {
      // Having no plans at all is answered by the welcome view, which can say
      // what a plan is and offer the sample. Having plans that are all archived
      // is one click from fixed and stays a row, because a welcome view here
      // would read as though the repository had nothing in it.
      if (this.rows.length === 0) return []
      return [
        {
          kind: "message",
          text: "Every plan here is archived. Use \u201CShow archived plans\u201D.",
        },
      ]
    }

    if (!this.grouped) return rows
    return groupPlansByBranch(rows).map((entry) => ({
      kind: "group" as const,
      branch: entry.branch,
      rows: entry.rows as Row[],
    }))
  }
}
