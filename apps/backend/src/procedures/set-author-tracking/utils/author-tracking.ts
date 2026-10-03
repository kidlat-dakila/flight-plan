import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { RepositoryAuthor, Setup, SetupRepository } from "@/procedures/get-setup/utils/setup"

type AuthorChange = (trackedAuthors: readonly RepositoryAuthor[]) => readonly RepositoryAuthor[]

const withAuthorChange = (setup: Setup, repositoryName: string, change: AuthorChange): Setup => ({
  ...setup,
  repositories: setup.repositories.map((repository): SetupRepository =>
    repository.name === repositoryName
      ? { ...repository, trackedAuthors: change(repository.trackedAuthors) }
      : repository,
  ),
})

const withoutAuthor = (trackedAuthors: readonly RepositoryAuthor[], authorId: string): readonly RepositoryAuthor[] =>
  trackedAuthors.filter((tracked) => tracked.id !== authorId)

const isSelfAuthor = (setup: Setup, repositoryName: string, author: RepositoryAuthor): boolean =>
  setup.repositories.some((repository) => repository.name === repositoryName && repository.selfAuthor?.id === author.id)

export const withTrackedAuthor = (setup: Setup, repositoryName: string, author: RepositoryAuthor): Setup =>
  isSelfAuthor(setup, repositoryName, author)
    ? setup
    : withAuthorChange(setup, repositoryName, (trackedAuthors) => [...withoutAuthor(trackedAuthors, author.id), author])

export const withSelfAuthor = (setup: Setup, repositoryName: string, author: RepositoryAuthor | null): Setup => ({
  ...setup,
  repositories: setup.repositories.map((repository): SetupRepository =>
    repository.name === repositoryName
      ? {
          ...repository,
          selfAuthor: author,
          trackedAuthors: author === null ? repository.trackedAuthors : withoutAuthor(repository.trackedAuthors, author.id),
        }
      : repository,
  ),
})

export const withoutTrackedAuthor = (setup: Setup, repositoryName: string, authorId: string): Setup =>
  withAuthorChange(setup, repositoryName, (trackedAuthors) => withoutAuthor(trackedAuthors, authorId))

export const withAuthors = (setup: Setup, repositoryName: string, authors: SelectedAuthors): Setup => ({
  ...setup,
  repositories: setup.repositories.map((repository): SetupRepository =>
    repository.name === repositoryName ? { ...repository, ...authors } : repository,
  ),
})
