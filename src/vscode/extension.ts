import { execFile } from "node:child_process"
import * as path from "node:path"
import { promisify } from "node:util"
import * as vscode from "vscode"
import { currentDocument, openReview } from "./panel"
import { completedMessage } from "./utils/panel"
import { documentReference } from "../utils/clipboard"
import { pluginStatus, removeAgentTooling } from "./setup"
import {
  resendGitAdapter,
  setCompletedHandler,
  setGitAdapterSource,
  setOpenHandler,
  startServer,
  stopServer,
} from "./serverProcess"
import { locations } from "./setup"
import { readConfig } from "../api/mcp/config"
import { createStorage } from "../api/mcp/storage"
import { recordCheckout } from "../api/mcp/checkouts"
import { openStored } from "./openStored"
import { openSetupView, openSetupViewOnInstall } from "./setupView"
import { PullRequestTree } from "./pr/tree"
import { PlanTree } from "./plan/tree"
import { openPullRequest } from "./pr/open"
import { repoName } from "../utils/git-adapter/helpers/remote"
import { gitAdapterSelection, resolveGitAdapter } from "./git-adapter/resolve"
import type { ReviewTarget } from "../lib/git-adapter/types"
import { Filters, Pins } from "./pr/listState"
import {
  addPullRequest,
  filterByLabel,
  filterByReview,
  filterMyPullRequests,
} from "./pr/filterCommands"
import { parseBranchName } from "./utils/refs"
import { setInstructionRoot } from "../lib/schemas/shippedInstructions"

/**
 * Copies one of the prompts for whatever document is in front.
 *
 * Still guarded, though `flightPlan.canCopyPrompt` now hides the buttons when
 * there is nothing to copy: a keybinding or the palette can invoke this from
 * anywhere, and copying the wrong document's prompt is worse than copying
 * nothing.
 */
async function copyPrompt(which: "update" | "regenerate"): Promise<void> {
  const document = currentDocument()
  if (document?.prompts == null) {
    void vscode.window.showWarningMessage(
      "Flight Plan: nothing in front of you has a prompt to copy.",
    )
    return
  }
  await vscode.env.clipboard.writeText(document.prompts[which])
  void vscode.window.setStatusBarMessage(
    which === "update"
      ? "Prompt copied. Paste it into your assistant to bring this up to date."
      : "Prompt copied. Paste it into your assistant to write it again from scratch.",
    4000,
  )
}

/**
 * Copies a reference to the whole document, for example
 * `[mcp:read-plan] owner/repo:plan/mcp-consumer-guide-tool`.
 *
 * The panel already copies a reference to one waypoint or one selection. This
 * is the same thing for the document itself, which is what you need when the
 * next sentence is about the plan rather than about a step in it.
 */
async function copyAnnotationPath(): Promise<void> {
  const document = currentDocument()
  if (document === null || document.planRef === "") {
    void vscode.window.showWarningMessage(
      "Flight Plan: open a walkthrough or plan first.",
    )
    return
  }
  await vscode.env.clipboard.writeText(
    documentReference(document.planRef, document.toolHint),
  )
  void vscode.window.setStatusBarMessage(
    "Annotation path copied. Paste it into your assistant to point it at this document.",
    4000,
  )
}

/** The folder pull requests are listed for. */
function repositoryFolder(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
}

/** `git fetch origin <branch>`, so the commit is on this machine. */
async function fetchBranch(cwd: string, branch: string): Promise<void> {
  await promisify(execFile)(
    "git",
    ["fetch", "origin", `${branch}:refs/remotes/origin/${branch}`],
    { cwd, timeout: 120_000 },
  )
}

export function activate(context: vscode.ExtensionContext): void {
  // The settings screen reads the shipped instructions from the package.
  setInstructionRoot(path.join(context.extensionUri.fsPath, "dist", "instructions"))
  // Workspace state, so what the list shows belongs to the folder it was
  // chosen in and never reaches a file anybody commits.
  const pins = new Pins(context.workspaceState)
  const filters = new Filters(context.workspaceState)
  const pullRequests = new PullRequestTree(context, repositoryFolder, pins, filters)
  // The tree badges each change by whether the server's storage holds a
  // walkthrough for it. Injected rather than imported so the tree stays a view
  // over one adapter plus one lookup.
  PullRequestTree.storedReader = async (repo, ref) => {
    try {
      const { server } = locations(context)
      return await createStorage(await readConfig(server)).readWalkthrough(repo, ref)
    } catch {
      return null
    }
  }

  const plans = new PlanTree(context, repositoryFolder)

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("flightPlan.pullRequests", pullRequests),
    vscode.window.registerTreeDataProvider("flightPlan.plans", plans),

    vscode.commands.registerCommand("flightPlan.refreshPullRequests", () => {
      pullRequests.refresh()
    }),

    // Three filters, three buttons. Each refreshes only if it changed
    // something, so escaping a picker leaves the list alone.
    vscode.commands.registerCommand("flightPlan.filterPullRequestsByLabel", async () => {
      if (await filterByLabel(filters, repositoryFolder(), pullRequests.gitAdapter())) {
        pullRequests.refresh()
      }
    }),

    vscode.commands.registerCommand("flightPlan.filterPullRequestsByReview", async () => {
      if (await filterByReview(filters, pullRequests.gitAdapter())) pullRequests.refresh()
    }),

    vscode.commands.registerCommand("flightPlan.filterMyPullRequests", async () => {
      if (await filterMyPullRequests(filters, pullRequests.gitAdapter())) {
        pullRequests.refresh()
      }
    }),

    vscode.commands.registerCommand("flightPlan.addPullRequest", async () => {
      await addPullRequest(
        pins,
        pullRequests.repository(),
        pullRequests.gitAdapter(),
        () => {
          pullRequests.refresh()
        },
      )
    }),

    vscode.commands.registerCommand("flightPlan.unpinPullRequest", async (row) => {
      // The row VS Code passes back is the tree's own element, and only a
      // pinned one has the menu item, but the argument is still typed as
      // whatever came through the command bus.
      const target = PullRequestTree.targetOf(row)
      if (target === null) return
      await pins.remove(pullRequests.repository(), target.ref)
      pullRequests.refresh()
    }),

    /**
     * Fetches a branch, for the reader who has been told to.
     *
     * Offered wherever plain git cannot answer because the commit is not on
     * this machine, which is the one failure a reader can fix themselves in a
     * second. The name comes from the panel's own state or from the tree, never
     * from a webview message: this reaches a subprocess.
     */
    vscode.commands.registerCommand(
      "flightPlan.fetchBranch",
      async (name?: unknown) => {
        const cwd = repositoryFolder()
        if (cwd === undefined) return
        const branch = typeof name === "string" ? name.trim() : ""
        const parsed = parseBranchName(branch)
        if (!parsed.ok) {
          void vscode.window.showWarningMessage(
            `Flight Plan cannot fetch that branch: ${parsed.reason}`,
          )
          return
        }
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Fetching ${parsed.name}`,
          },
          async () => {
            try {
              await fetchBranch(cwd, parsed.name)
              void vscode.window.showInformationMessage(
                `Fetched ${parsed.name}. Open it again to read it from the checkout.`,
              )
              pullRequests.refresh()
            } catch (cause) {
              void vscode.window.showErrorMessage(
                `Flight Plan could not fetch ${parsed.name}: ${String(cause)}`,
              )
            }
          },
        )
      },
    ),

    vscode.commands.registerCommand("flightPlan.refreshPlans", () => {
      plans.refresh()
    }),

    // Four toggles rather than two, because a command cannot change its own
    // title: the view shows whichever of each pair its context key allows.
    vscode.commands.registerCommand("flightPlan.groupPullRequestsByAuthor", () =>
      pullRequests.setGrouped(true),
    ),
    vscode.commands.registerCommand("flightPlan.ungroupPullRequests", () =>
      pullRequests.setGrouped(false),
    ),

    vscode.commands.registerCommand("flightPlan.groupPlansByBranch", () =>
      plans.setGrouped(true),
    ),
    vscode.commands.registerCommand("flightPlan.ungroupPlans", () =>
      plans.setGrouped(false),
    ),
    vscode.commands.registerCommand("flightPlan.showArchivedPlans", () =>
      plans.setShowArchived(true),
    ),
    vscode.commands.registerCommand("flightPlan.hideArchivedPlans", () =>
      plans.setShowArchived(false),
    ),

    vscode.commands.registerCommand(
      "flightPlan.archivePlan",
      async (node: unknown) => {
        await archivePlan(plans, node, true)
      },
    ),
    vscode.commands.registerCommand(
      "flightPlan.unarchivePlan",
      async (node: unknown) => {
        await archivePlan(plans, node, false)
      },
    ),

    vscode.commands.registerCommand(
      "flightPlan.openPlan",
      async (plan: { name: string }) => {
        const cwd = repositoryFolder()
        if (cwd === undefined) {
          void vscode.window.showWarningMessage(
            "Flight Plan: open the repository folder first.",
          )
          return
        }
        const repo = await repoName(cwd)
        if (repo === null) {
          void vscode.window.showWarningMessage(
            "Flight Plan: this folder has no git remote, so its plans cannot be found.",
          )
          return
        }
        try {
          // Through the same path an assistant's `open-plan` takes, so a plan
          // opened from the list and a plan opened by the agent that wrote it
          // are the same document rendered the same way.
          openStored(context, { kind: "plan", repo, name: plan.name })
        } catch (cause) {
          void vscode.window.showErrorMessage(
            `Flight Plan could not open that plan: ${String(cause)}`,
          )
        }
      },
    ),

    vscode.commands.registerCommand(
      "flightPlan.openPullRequest",
      async (target: ReviewTarget) => {
        const cwd = repositoryFolder()
        if (cwd === undefined) {
          void vscode.window.showWarningMessage(
            "Flight Plan: open the repository folder first.",
          )
          return
        }
        /*
         * Resolved here rather than taken from the tree.
         *
         * The tree's adapter is from its last load, and the setting can change
         * while the window is open — which is exactly what happens when
         * somebody follows the panel's own "open setup" button and comes back.
         * Reading it fresh means the first thing they open afterwards uses what
         * they just chose.
         */
        const resolved = await resolveGitAdapter(context, cwd)
        if (!resolved.ok) {
          const choice = await vscode.window.showWarningMessage(
            resolved.error.message,
            "Open setup",
          )
          if (choice !== undefined) {
            await vscode.commands.executeCommand("flightPlan.openSetup")
          }
          return
        }
        try {
          openPullRequest(context, target, resolved.repo)
        } catch (cause) {
          void vscode.window.showErrorMessage(
            `Flight Plan could not open that: ${String(cause)}`,
          )
        }
      },
    ),
  )

  // Listed once the window has settled, so no adapter call is ever on the path of
  // the editor becoming usable.
  pullRequests.refresh()

  context.subscriptions.push(
    vscode.commands.registerCommand("flightPlan.openSetup", async () => {
      try {
        await openSetupView(context)
      } catch (cause) {
        void vscode.window.showErrorMessage(
          `Flight Plan could not open setup: ${String(cause)}`,
        )
      }
    }),

    vscode.commands.registerCommand("flightPlan.copyUpdatePrompt", async () => {
      await copyPrompt("update")
    }),

    vscode.commands.registerCommand("flightPlan.copyRegeneratePrompt", async () => {
      await copyPrompt("regenerate")
    }),

    vscode.commands.registerCommand("flightPlan.copyAnnotationPath", async () => {
      await copyAnnotationPath()
    }),

    /*
     * The server's own log (`src/api/log.ts`), on the machine the server runs
     * on: in a remote window that is the remote, which is why it is opened
     * through VS Code rather than looked for by hand.
     */
    vscode.commands.registerCommand("flightPlan.openServerLog", async () => {
      const file = vscode.Uri.file(path.join(locations(context).server, "logs", "server.log"))
      try {
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file), { preview: false })
      } catch {
        void vscode.window.showInformationMessage(
          "Flight Plan: the server has not written a log yet. It starts one the first time it runs.",
        )
      }
    }),

    vscode.commands.registerCommand("flightPlan.openSettings", async () => {
      // Built from the extension's own id rather than written out. The publisher
      // is still `undefined_publisher` and will change on the first real
      // release, at which point a hardcoded `@ext:` query would silently start
      // matching nothing and the command would open an empty Settings page.
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `@ext:${context.extension.id}`,
      )
    }),

    vscode.commands.registerCommand("flightPlan.removeAgentTooling", async () => {
      try {
        await removeAgentTooling(context)
      } catch (cause) {
        void vscode.window.showErrorMessage(
          `Flight Plan could not remove the agent tooling: ${String(cause)}`,
        )
      }
    }),
  )

  // The server's own channel back. Agents reach it over HTTP; this is the
  // extension talking to its own child process.
  setOpenHandler((request) => {
    // A plan the agent just wrote is not in the list yet.
    if (request.kind === "plan") plans.refresh()
    try {
      openStored(context, request)
    } catch (cause) {
      void vscode.window.showWarningMessage(
        `Flight Plan could not open that: ${String(cause)}`,
      )
    }
  })

  /*
   * "The review is ready". For every kind
   * `complete` finishes, and whether or not the reader has it open: the
   * button brings the panel forward, or opens it.
   */
  setCompletedHandler((id) => {
    const message = completedMessage(id)
    if (message === null) return
    void vscode.window.showInformationMessage(message, "View review").then((choice) => {
      if (choice !== undefined) openReview(context, id)
    })
  })

  /*
   * The server builds its own adapter from what this process holds: the choice
   * in settings and the credential in the keychain. Sent at every start, and
   * again whenever either changes, so the server never keeps a stale one.
   */
  setGitAdapterSource(() => gitAdapterSelection(context))
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("flightPlan.forge") ||
        event.affectsConfiguration("flightPlan.forgeBaseUrl") ||
        event.affectsConfiguration("flightPlan.bitbucketUsername")
      ) {
        void resendGitAdapter()
      }
    }),
    context.secrets.onDidChange(() => {
      void resendGitAdapter()
    }),
  )

  // Started here and stopped on deactivate: this is what makes the server the
  // extension's rather than each agent's. Only when it has been installed, since
  // before that there is no server file and failing loudly on a fresh install
  // would be alarming for no reason.
  void pluginStatus(context).then(async (status) => {
    if (!status.installed) return
    try {
      await startServer(context)
    } catch (cause) {
      void vscode.window.showWarningMessage(
        `Flight Plan's server did not start: ${String(cause)}`,
      )
    }
  })

  // What the plan tools need and cannot discover: which directory holds which
  // repository. Recorded on every activation, because a checkout can move and
  // a stale entry would have a plan checked against the wrong tree.
  void recordCheckouts(context)

  // Nothing Flight Plan does works until an agent can reach its tools, and that
  // registration lives in another application's files. Waiting to be asked would
  // mean sitting there broken. Shown again after an upgrade, because an upgrade
  // leaves those files pointing at the previous version.
  void openSetupViewOnInstall(context)
}

/**
 * Archives the plan a tree row stands for, or brings it back.
 *
 * The argument comes from the tree, so it is whatever `PlanTree` put there
 * rather than anything this signature can promise — hence `unknown` and
 * `planOf`, which returns null for a group or a message row.
 */
async function archivePlan(
  plans: PlanTree,
  node: unknown,
  archived: boolean,
): Promise<void> {
  const plan = PlanTree.planOf(node as Parameters<typeof PlanTree.planOf>[0])
  if (plan === null) return
  try {
    await plans.setArchived(plan.name, archived)
  } catch (cause) {
    void vscode.window.showErrorMessage(
      `Flight Plan could not ${archived ? "archive" : "unarchive"} that plan: ${String(cause)}`,
    )
  }
}

/**
 * Tells the server where this window's repositories are.
 *
 * The MCP server runs as a plain node process with no workspace of its own,
 * and a plan's positions are checked against the working tree on the current
 * branch — a directory only the extension knows. Failures are swallowed: a
 * folder with no remote to name is simply not recorded, and the plan tools then
 * say the positions went unchecked rather than guessing at a tree.
 *
 * This reads the git remote and nothing else, so it works on a machine with no
 * CLI, no token and no network. It used to shell out to `gh repo view`, which
 * made recording a checkout — a purely local fact — depend on being signed in
 * to GitHub.
 */
async function recordCheckouts(context: vscode.ExtensionContext): Promise<void> {
  const { server } = locations(context)
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const root = folder.uri.fsPath
    const repo = await repoName(root)
    if (repo === null) continue
    try {
      await recordCheckout(server, repo, root)
    } catch {
      // The server has not been installed yet, or its storage is unwritable.
      // Neither is worth a notification: the user has not asked for anything.
    }
  }
}

export function deactivate(): void {
  // The server is a child process, so it does not go away on its own.
  stopServer()
}
