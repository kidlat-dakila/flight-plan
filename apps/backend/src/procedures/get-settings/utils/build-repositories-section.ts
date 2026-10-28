import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { RegisteredRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { toRepositoryEntry } from "@/procedures/get-setup/utils/build-repositories-step"
import type { GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import { repositoryHref } from "@/procedures/list-repositories/utils/build-repository-index"
import { isNobodyTracked } from "@/procedures/list-repositories/utils/tracked-authors"
import type { FollowedRepository, RepositoriesSection } from "./schemas"

export interface RepositoryFollowing {
  readonly repository: RegisteredRepository
  readonly authors: SelectedAuthors
  readonly forge: SetupForge
  readonly identity: GitIdentity | null
}

const EVERYONE_FOLLOWED_MESSAGE = "No team members are picked, so Flight Plan follows everyone in this repository."
const ADDED_BRANCHES_MESSAGE = "No team members are picked, so Flight Plan lists only the branches you add to this repository."

const nobodyTrackedMessage = (forge: SetupForge): string => (forge === "git" ? ADDED_BRANCHES_MESSAGE : EVERYONE_FOLLOWED_MESSAGE)

const toFollowedRepository = (
  { repository, authors, forge, identity }: RepositoryFollowing,
  position: number,
): FollowedRepository => ({
  ...toRepositoryEntry({ ...repository, ...authors }, position, forge, identity),
  configurationHref: `${repositoryHref(repository)}/configurations`,
  emptyMessage: isNobodyTracked(authors.trackedAuthors.map((author) => author.id)) ? nobodyTrackedMessage(forge) : null,
})

export const buildRepositoriesSection = (followings: readonly RepositoryFollowing[]): RepositoriesSection => ({
  section: "repositories",
  repositories: followings.map(toFollowedRepository),
})
