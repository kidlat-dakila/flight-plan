export interface RecentRepository {
  readonly path: string
  readonly name: string
  readonly branch: string
  readonly latestCommitLabel: string
  readonly stateLabel: string | null
}

interface FollowedRepository {
  readonly name: string
  readonly path: string
}

export interface RepositoryRow<Followed extends FollowedRepository> {
  readonly path: string
  readonly name: string
  readonly activityLabel: string | null
  readonly stateLabel: string | null
  readonly followed: Followed | null
}

const activityLabelOf = (recent: RecentRepository): string =>
  `Your last commit on ${recent.branch}, ${recent.latestCommitLabel}`

const toRecentRow = <Followed extends FollowedRepository>(
  recent: RecentRepository,
  followedByPath: ReadonlyMap<string, Followed>,
): RepositoryRow<Followed> => {
  const followed = followedByPath.get(recent.path) ?? null
  return {
    path: recent.path,
    name: recent.name,
    activityLabel: activityLabelOf(recent),
    stateLabel: followed === null ? recent.stateLabel : null,
    followed,
  }
}

const toAddedRow = <Followed extends FollowedRepository>(followed: Followed): RepositoryRow<Followed> => ({
  path: followed.path,
  name: followed.name,
  activityLabel: null,
  stateLabel: null,
  followed,
})

export const toRepositoryRows = <Followed extends FollowedRepository>(
  recentRepositories: readonly RecentRepository[],
  followedRepositories: readonly Followed[],
): readonly RepositoryRow<Followed>[] => {
  const followedByPath = new Map(followedRepositories.map((repository) => [repository.path, repository]))
  const recentPaths = new Set(recentRepositories.map((recent) => recent.path))
  return [
    ...recentRepositories.map((recent) => toRecentRow(recent, followedByPath)),
    ...followedRepositories.filter((repository) => !recentPaths.has(repository.path)).map(toAddedRow),
  ]
}
