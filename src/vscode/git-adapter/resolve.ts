import * as vscode from "vscode"
import { assembleGitAdapter, GIT_ADAPTER_IDS, secretKey, type Resolved } from "../../utils/git-adapter/helpers/assemble"
import type { GitAdapterId } from "../../lib/git-adapter/types"
import type { GitAdapterSelection } from "../../utils/git-adapter/helpers/session"

/**
 * Turns a choice, a credential and a checkout into a adapter.
 *
 * The half of the selection that touches VS Code: this reads settings and the
 * keychain. What it decides lives in `select.ts`, and the assembly in
 * `src/api/git-adapter/assemble.ts`, both pure.
 *
 * A single global choice rather than one per repository. That is a real
 * constraint and it is stated rather than hidden: somebody with repositories on
 * two hosts is told which host Flight Plan is set up for and which one the
 * folder is on, instead of being shown a wall of 404s or, worse, a plausible
 * list of somebody else's pull requests.
 */

/** The key the GitHub token used before there was more than one adapter. */
const LEGACY_GITHUB_TOKEN = "flightPlan.githubToken"

function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration("flightPlan")
}

/**
 * Which adapter is configured, defaulting to plain git.
 *
 * The default is `git` and nothing probes for anything better. An earlier
 * version ran `gh auth token` once and adopted the CLI if it answered, which
 * made the setting reflect a decision the user had not made — and made the same
 * machine behave differently depending on what happened to be installed on it.
 * A adapter is chosen in setup or it is git.
 */
export function currentGitAdapterId(): GitAdapterId {
  const stored = config().get<string>("forge") ?? "git"
  return (GIT_ADAPTER_IDS as readonly string[]).includes(stored)
    ? (stored as GitAdapterId)
    : "git"
}

export async function setGitAdapterId(id: GitAdapterId): Promise<void> {
  await config().update("forge", id, vscode.ConfigurationTarget.Global)
}

export function baseUrl(): string {
  return config().get<string>("forgeBaseUrl") ?? ""
}

export async function setBaseUrl(url: string): Promise<void> {
  await config().update("forgeBaseUrl", url, vscode.ConfigurationTarget.Global)
}

/** Bitbucket authenticates with a username as well as an app password. */
export function bitbucketUsername(): string {
  return config().get<string>("bitbucketUsername") ?? ""
}

export async function setBitbucketUsername(name: string): Promise<void> {
  await config().update(
    "bitbucketUsername",
    name,
    vscode.ConfigurationTarget.Global,
  )
}

/**
 * The credential for a adapter, if there is one.
 *
 * The old single-token key is read as a fallback for `github`, so somebody who
 * stored one before this existed is not asked for it again.
 */
export async function credential(
  context: vscode.ExtensionContext,
  id: GitAdapterId,
): Promise<string | null> {
  const stored = await context.secrets.get(secretKey(id))
  if (stored !== undefined && stored !== "") return stored
  if (id === "github") {
    const legacy = await context.secrets.get(LEGACY_GITHUB_TOKEN)
    if (legacy !== undefined && legacy !== "") return legacy
  }
  return null
}

export async function storeCredential(
  context: vscode.ExtensionContext,
  id: GitAdapterId,
  value: string,
): Promise<void> {
  await context.secrets.store(secretKey(id), value)
}

export async function clearCredential(
  context: vscode.ExtensionContext,
  id: GitAdapterId,
): Promise<void> {
  await context.secrets.delete(secretKey(id))
  if (id === "github") await context.secrets.delete(LEGACY_GITHUB_TOKEN)
}

/**
 * The adapter for a folder, or the reason there is not one.
 *
 * Reads the choice, the base URL and the credential from VS Code, then hands
 * them to `assembleGitAdapter`. Never throws; see there.
 */
export async function resolveGitAdapter(
  context: vscode.ExtensionContext,
  root: string,
): Promise<Resolved> {
  const id = currentGitAdapterId()
  return assembleGitAdapter({
    id,
    root,
    secret: id === "git" ? null : await credential(context, id),
    username: bitbucketUsername(),
    baseUrl: baseUrl(),
  })
}

/**
 * What the server is handed to build its own adapter: the same inputs
 * `resolveGitAdapter` reads, without a checkout.
 */
export async function gitAdapterSelection(
  context: vscode.ExtensionContext,
): Promise<GitAdapterSelection> {
  const id = currentGitAdapterId()
  return {
    id,
    baseUrl: baseUrl(),
    username: bitbucketUsername(),
    secret: id === "git" ? null : await credential(context, id),
  }
}
