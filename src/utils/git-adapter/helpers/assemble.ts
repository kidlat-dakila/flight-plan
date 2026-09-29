import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { BaseGitAdapter } from "../base"
import { BitbucketAdapter } from "../bitbucket-adapter"
import { GithubCLIAdapter } from "../github-cli-adapter"
import { GithubTokenAdapter } from "../github-token-adapter"
import { GitlabAdapter } from "../gitlab-adapter"
import { readRemote } from "./remote"
import { GIT_ADAPTER_NAMES, selectGitAdapter } from "./select"
import { GitAdapterError, type GitAdapter, type GitAdapterId } from "../../../lib/git-adapter/types"

/**
 * Turns a choice, a credential and a checkout into a adapter.
 *
 * The pure half of adapter selection. `src/vscode/git-adapter/resolve.ts` reads the
 * inputs from settings and the keychain and passes them in.
 */

const run = promisify(execFile)

export const GIT_ADAPTER_IDS: readonly GitAdapterId[] = [
  "git",
  "gh",
  "github",
  "gitlab",
  "bitbucket",
]

/**
 * Where a credential lives.
 *
 * `SecretStorage`, which is the OS keychain. Never a setting, because settings
 * sync between machines and are stored in plain text. Never the plugin
 * directory, because the agent reads that.
 */
export function secretKey(id: GitAdapterId): string {
  return `flightPlan.token.${id}`
}

/** Whether `gh` is installed and signed in on this machine. */
export async function ghSignedIn(): Promise<boolean> {
  try {
    const { stdout } = await run("gh", ["auth", "token"], { timeout: 5000 })
    return stdout.trim() !== ""
  } catch {
    return false
  }
}

export type Resolved =
  | { ok: true; gitAdapter: GitAdapter; repo: string }
  | { ok: false; error: GitAdapterError; repo: string }

/** What a adapter is built from: the choice, the checkout, and its credential. */
export type GitAdapterInput = {
  id: GitAdapterId
  root: string
  /** The token or app password; null when none is stored, and always for git. */
  secret: string | null
  /** The Bitbucket username; "" when unset. Other adapters ignore it. */
  username: string
  baseUrl: string
}

/**
 * The adapter for a folder, or the reason there is not one.
 *
 * Never throws. Every caller here is a view that has to render something, and
 * an exception would send them all through a catch that turns a considered
 * refusal back into `String(cause)`.
 */
export async function assembleGitAdapter(input: GitAdapterInput): Promise<Resolved> {
  const { id, root, secret, username, baseUrl } = input
  const remote = await readRemote(root)
  const repo = remote?.fullName ?? ""

  const isBitbucket = id === "bitbucket"
  const hasCredential = secret !== null && (!isBitbucket || username !== "")

  const selection = selectGitAdapter({
    id,
    remoteHost: remote?.host ?? null,
    baseUrl,
    hasCredential,
  })
  if (!selection.ok) return { ok: false, error: selection.error, repo }

  /*
   * git is the one adapter that works without a remote. It reads the checkout,
   * so a folder with no remote still has branches, files and commits — it just
   * has no name to store documents under, which the caller handles.
   */
  if (id === "git") return { ok: true, gitAdapter: new BaseGitAdapter({ root, repo }), repo }

  if (repo === "") {
    return {
      ok: false,
      error: new GitAdapterError(
        "This folder has no git remote, so there is no repository to read.",
        "no-repo",
      ),
      repo,
    }
  }

  switch (id) {
    case "gh":
      return { ok: true, gitAdapter: new GithubCLIAdapter({ root, repo }), repo }
    case "github":
      return {
        ok: true,
        gitAdapter: new GithubTokenAdapter({
          repo,
          root,
          token: secret ?? "",
          baseUrl,
        }),
        repo,
      }
    case "gitlab":
      return {
        ok: true,
        gitAdapter: new GitlabAdapter({
          repo,
          root,
          token: secret ?? "",
          baseUrl,
        }),
        repo,
      }
    case "bitbucket":
      return {
        ok: true,
        gitAdapter: new BitbucketAdapter({
          repo,
          root,
          username,
          token: secret ?? "",
          baseUrl,
        }),
        repo,
      }
    default:
      return {
        ok: false,
        error: new GitAdapterError(
          `${GIT_ADAPTER_NAMES[id]} is not something Flight Plan can read.`,
          "unsupported",
        ),
        repo,
      }
  }
}
