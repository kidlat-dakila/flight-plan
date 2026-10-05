import { GitAdapterError, type GitAdapterId } from "@/git-adapter/types"

export const CLOUD_HOSTS: Record<GitAdapterId, string | null> = {
  git: null,
  gh: "github.com",
  github: "github.com",
  gitlab: "gitlab.com",
  glab: null,
  bitbucket: "bitbucket.org",
}

export const GIT_ADAPTER_NAMES: Record<GitAdapterId, string> = {
  git: "git",
  gh: "the GitHub CLI",
  github: "GitHub",
  gitlab: "GitLab",
  glab: "the GitLab CLI",
  bitbucket: "Bitbucket",
}

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

export function expectedHost(id: GitAdapterId, baseUrl: string): string | null {
  return hostOfBaseUrl(baseUrl) ?? CLOUD_HOSTS[id]
}

export type Selection
  = | { ok: true }
    | { ok: false, error: GitAdapterError }

export function selectGitAdapter(options: {
  id: GitAdapterId

  remoteHost: string | null
  baseUrl: string

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
        `This repository is on ${remoteHost}, and Flight Plan is set up to use `
        + `${GIT_ADAPTER_NAMES[id]} on ${wanted}. Change it in Flight Plan's setup, or `
        + `open a repository on ${wanted}.`,
        "host-mismatch",
      ),
    }
  }

  if (id !== "gh" && id !== "glab" && !hasCredential) {
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
