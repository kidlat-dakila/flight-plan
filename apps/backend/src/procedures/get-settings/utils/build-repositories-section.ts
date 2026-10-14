import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { toTrackedAuthor } from "@/procedures/get-setup/utils/build-repositories-step"
import type { SetupForge } from "@/procedures/get-setup/utils/setup"
import { repositoryHref } from "@/procedures/list-repositories/utils/build-repository-index"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { isNobodyTracked } from "@/procedures/list-repositories/utils/tracked-authors"
import type { FollowedRepository, RepositoriesSection } from "./schemas"

export interface RepositoryFollowing {
  readonly repository: ListedRepository
  readonly authors: SelectedAuthors
  readonly forge: SetupForge
}

const NO_REPOSITORIES_MESSAGE = "No repositories yet. Add one to start."
const EVERYONE_FOLLOWED_MESSAGE = "No team members are picked, so Flight Plan follows everyone in this repository."
const ADDED_BRANCHES_MESSAGE = "No team members are picked, so Flight Plan lists only the branches you add to this repository."

const nobodyTrackedMessage = (forge: SetupForge): string => (forge === "git" ? ADDED_BRANCHES_MESSAGE : EVERYONE_FOLLOWED_MESSAGE)

const toFollowedRepository = ({ repository, authors, forge }: RepositoryFollowing, position: number): FollowedRepository => ({
  name: repository.name,
  path: repository.path,
  lineColor: lineColorAt(position),
  lineLabel: repository.name.charAt(0).toUpperCase(),
  configurationHref: `${repositoryHref(repository)}/configurations`,
  selfAuthor: authors.selfAuthor === null ? null : toTrackedAuthor(authors.selfAuthor),
  trackedAuthors: authors.trackedAuthors.map(toTrackedAuthor),
  emptyMessage: isNobodyTracked(authors.trackedAuthors.map((author) => author.id)) ? nobodyTrackedMessage(forge) : null,
})

export const buildRepositoriesSection = (followings: readonly RepositoryFollowing[]): RepositoriesSection => ({
  section: "repositories",
  repositories: followings.map(toFollowedRepository),
  emptyMessage: followings.length === 0 ? NO_REPOSITORIES_MESSAGE : null,
})
