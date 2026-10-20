export interface RecentRepository {
  readonly path: string
  readonly name: string
  readonly stateLabel: string | null
}

interface NamedRepository {
  readonly name: string
  readonly path: string
}

export interface RepositoryRow<Followed extends NamedRepository> {
  readonly path: string
  readonly name: string
  readonly stateLabel: string | null
  readonly followed: Followed | null
}

const toRecentRow = <Followed extends NamedRepository>(
  recent: RecentRepository,
  followedByPath: ReadonlyMap<string, Followed>,
): RepositoryRow<Followed> => {
  const followed = followedByPath.get(recent.path) ?? null
  return {
    path: recent.path,
    name: recent.name,
    stateLabel: followed === null ? recent.stateLabel : null,
    followed,
  }
}

const toAddedRow = <Followed extends NamedRepository>(followed: Followed): RepositoryRow<Followed> => ({
  path: followed.path,
  name: followed.name,
  stateLabel: null,
  followed,
})

export const toRepositoryRows = <Followed extends NamedRepository>(
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
