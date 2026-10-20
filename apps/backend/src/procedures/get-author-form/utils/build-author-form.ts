import {
  authorSearchHint,
  authorSearchPlaceholder,
  SELF_AUTHOR_HINT,
  toTrackedAuthor,
} from "@/procedures/get-setup/utils/build-repositories-step"
import { isSelfAuthorChoiceNeeded, toIdentityAuthor, type GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorForm } from "./schemas"

const gitSelfAuthorOf = (identity: GitIdentity | null): AuthorForm["gitSelfAuthor"] =>
  identity === null ? null : { author: toTrackedAuthor(toIdentityAuthor(identity)) }

export const buildAuthorForm = (forge: SetupForge, identity: GitIdentity | null): AuthorForm => ({
  selfAuthorHint: isSelfAuthorChoiceNeeded(forge, identity) ? SELF_AUTHOR_HINT : null,
  gitSelfAuthor: gitSelfAuthorOf(identity),
  searchHint: authorSearchHint(forge),
  searchPlaceholder: authorSearchPlaceholder(forge),
})
