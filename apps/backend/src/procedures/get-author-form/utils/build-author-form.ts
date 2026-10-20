import { authorSearchHint, authorSearchPlaceholder, toTrackedAuthor } from "@/procedures/get-setup/utils/build-repositories-step"
import { toIdentityAuthor, type GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorForm } from "./schemas"

const gitSelfAuthorOf = (identity: GitIdentity | null): AuthorForm["gitSelfAuthor"] =>
  identity === null ? null : { author: toTrackedAuthor(toIdentityAuthor(identity)) }

export const buildAuthorForm = (forge: SetupForge, identity: GitIdentity | null, repositoryName: string): AuthorForm => ({
  gitSelfAuthor: gitSelfAuthorOf(identity),
  searchHint: authorSearchHint(forge, repositoryName),
  searchPlaceholder: authorSearchPlaceholder(forge),
})
