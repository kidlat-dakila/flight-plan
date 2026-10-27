import { BaseGitAdapter } from "@/git-adapter/base"
import { BitbucketAdapter, isCloudUrl } from "@/git-adapter/bitbucket-adapter"
import { BitbucketDataCenterAdapter } from "@/git-adapter/bitbucket-data-center-adapter"
import { GithubCLIAdapter } from "@/git-adapter/github-cli-adapter"
import { GithubTokenAdapter } from "@/git-adapter/github-token-adapter"
import { GitlabAdapter } from "@/git-adapter/gitlab-adapter"
import { GitlabCLIAdapter } from "@/git-adapter/gitlab-cli-adapter"
import { GitAdapterError, type GitAdapter, type GitAdapterId } from "@/git-adapter/types"
import { readRemote } from "./remote"
import { selectGitAdapter } from "./select"

export const GIT_ADAPTER_IDS: readonly GitAdapterId[] = [
  "git",
  "gh",
  "github",
  "gitlab",
  "glab",
  "bitbucket",
]

export type Resolved
  = | { ok: true, gitAdapter: GitAdapter, repo: string }
    | { ok: false, error: GitAdapterError, repo: string }

export interface GitAdapterInput {
  id: GitAdapterId
  root: string
  secret: string | null
  username: string
  baseUrl: string
  environment?: Readonly<Record<string, string | undefined>>
  baseBranch?: string | null
}

export async function assembleGitAdapter(input: GitAdapterInput): Promise<Resolved> {
  const { id, root, secret, username, baseUrl, environment, baseBranch } = input
  const remote = await readRemote(root)
  const repo = remote?.fullName ?? ""

  const isUsernameRequired = id === "bitbucket" && isCloudUrl(baseUrl)
  const hasCredential = secret !== null && (!isUsernameRequired || username !== "")

  const selection = selectGitAdapter({
    id,
    remoteHost: remote?.host ?? null,
    baseUrl,
    hasCredential,
  })
  if (!selection.ok) return { ok: false, error: selection.error, repo }

  if (id === "git") return { ok: true, gitAdapter: new BaseGitAdapter({ root, repo, environment, baseBranch }), repo }

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
      return { ok: true, gitAdapter: new GithubCLIAdapter({ root, repo, environment, baseBranch }), repo }
    case "github":
      return {
        ok: true,
        gitAdapter: new GithubTokenAdapter({
          repo,
          root,
          environment,
          baseBranch,
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
          environment,
          baseBranch,
          token: secret ?? "",
          baseUrl,
        }),
        repo,
      }
    case "glab":
      return {
        ok: true,
        gitAdapter: new GitlabCLIAdapter({ root, repo, environment, baseBranch, baseUrl: remote === null ? "" : `https://${remote.host}` }),
        repo,
      }
    case "bitbucket":
      return {
        ok: true,
        gitAdapter: isCloudUrl(baseUrl)
          ? new BitbucketAdapter({ repo, root, environment, baseBranch, username, token: secret ?? "" })
          : new BitbucketDataCenterAdapter({ repo, root, environment, baseBranch, token: secret ?? "", baseUrl }),
        repo,
      }
  }
}
