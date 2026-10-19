import { needsSelfAuthor, type RepositoryAuthor, type SetupForge } from "./setup"

export interface GitIdentity {
  readonly name: string | null
  readonly email: string
}

export type RepositoryIdentities = Readonly<Record<string, GitIdentity>>

const settingOf = (output: string | null): string | null => {
  const value = output?.trim() ?? ""
  return value === "" ? null : value
}

export const parseGitIdentity = (nameOutput: string | null, emailOutput: string | null): GitIdentity | null => {
  const email = settingOf(emailOutput)
  return email === null ? null : { name: settingOf(nameOutput), email: email.toLowerCase() }
}

export const repositoryIdentityOf = (identities: RepositoryIdentities, path: string): GitIdentity | null =>
  identities[path] ?? null

export const toIdentityAuthor = (identity: GitIdentity): RepositoryAuthor => ({
  id: identity.email,
  name: identity.name ?? identity.email,
  detail: identity.email,
  avatarUrl: null,
})

export const selfAuthorOf = (identity: GitIdentity | null, chosenSelfAuthor: RepositoryAuthor | null): RepositoryAuthor | null =>
  identity === null ? chosenSelfAuthor : toIdentityAuthor(identity)

export const selfAuthorIdOf = (identity: GitIdentity | null, chosenSelfAuthor: RepositoryAuthor | null): string | null =>
  selfAuthorOf(identity, chosenSelfAuthor)?.id ?? null

export const isSelfAuthorChoiceNeeded = (forge: SetupForge, identity: GitIdentity | null): boolean =>
  needsSelfAuthor(forge) && identity === null
