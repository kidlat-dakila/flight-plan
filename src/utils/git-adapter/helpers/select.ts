import { GitAdapterError, type GitAdapterId } from "../../../lib/git-adapter/types"

/**
 * Which adapter answers for a checkout, decided before anything is constructed.
 *
 * Separated from the code that reads settings and the keychain so it can be
 * tested at all: everything here is a pure function of the choice, the remote's
 * host and whether a credential exists. The half that touches VS Code lives in
 * `resolve.ts` and does nothing but gather these arguments.
 *
 * The decision it exists to make is the one nobody expects to need. A user
 * picks GitLab in setup, opens a repository whose remote is on github.com, and
 * every call then fails with a 404 from a host that has never heard of the
 * project. Answering "that repository is not on the adapter you configured" is
 * one comparison, and it is the difference between a sentence and a support
 * thread.
 */

/** The cloud host each adapter answers for when no base URL is configured. */
export const CLOUD_HOSTS: Record<GitAdapterId, string | null> = {
  // Plain git makes no claim about where the remote is, which is exactly why it
  // works everywhere and can list nothing.
  git: null,
  gh: "github.com",
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
}

export const GIT_ADAPTER_NAMES: Record<GitAdapterId, string> = {
  git: "git",
  gh: "the GitHub CLI",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
}

/**
 * The host a configured base URL points at.
 *
 * Null when the setting is empty, which means "use the cloud host". A base URL
 * that cannot be parsed is also null rather than a throw: the panel says the
 * host does not match, which sends the reader to the setting that is wrong.
 */
export function hostOfBaseUrl(baseUrl: string): string | null {
  const trimmed = baseUrl.trim()
  if (trimmed === "") return null
  try {
    return new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    ).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Which host the chosen adapter is expected to answer for. */
export function expectedHost(id: GitAdapterId, baseUrl: string): string | null {
  return hostOfBaseUrl(baseUrl) ?? CLOUD_HOSTS[id]
}

export type Selection =
  | { ok: true }
  | { ok: false; error: GitAdapterError }

/**
 * Whether the chosen adapter can answer for this remote.
 *
 * `git` always can: it reads the checkout and never asks a host anything, so a
 * remote pointing anywhere at all — or nowhere — is fine.
 *
 * Everything else is checked against one host, because the choice is a single
 * global setting. Somebody with repositories on two hosts gets a clear refusal
 * naming both, which is a better failure than a list of somebody else's pull
 * requests or a wall of 404s.
 */
export function selectGitAdapter(options: {
  id: GitAdapterId
  /** The host from the git remote, or null when there is no usable remote. */
  remoteHost: string | null
  baseUrl: string
  /** Whether a credential exists, for the adapters that need one. */
  hasCredential: boolean
}): Selection {
  const { id, remoteHost, baseUrl, hasCredential } = options

  if (id === "git") return { ok: true }

  if (remoteHost === null) {
    return {
      ok: false,
      error: new GitAdapterError(
        "This folder has no git remote, so there is no repository to read.",
        "no-repo",
      ),
    }
  }

  const wanted = expectedHost(id, baseUrl)
  if (wanted !== null && remoteHost.toLowerCase() !== wanted) {
    return {
      ok: false,
      error: new GitAdapterError(
        `This repository is on ${remoteHost}, and Flight Plan is set up to use ` +
          `${GIT_ADAPTER_NAMES[id]} on ${wanted}. Change it in Flight Plan's setup, or ` +
          `open a repository on ${wanted}.`,
        "host-mismatch",
      ),
    }
  }

  /*
   * The CLI is excused: it holds its own credentials, and asking whether a
   * token exists in our keychain would refuse a perfectly working `gh` because
   * nobody pasted a token we never wanted.
   */
  if (id !== "gh" && !hasCredential) {
    return {
      ok: false,
      error: new GitAdapterError(
        `Flight Plan has no ${GIT_ADAPTER_NAMES[id]} token yet. Add one in setup.`,
        "auth",
      ),
    }
  }

  return { ok: true }
}
