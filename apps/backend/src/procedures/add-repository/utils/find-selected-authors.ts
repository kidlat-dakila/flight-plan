import type { RepositoryAuthor, SetupRepository } from "@/procedures/get-setup/utils/setup"

export interface AuthorSelection {
  readonly selfAuthorId: string | null
  readonly trackedAuthorIds: readonly string[]
}

export interface SelectedAuthors {
  readonly selfAuthor: RepositoryAuthor | null
  readonly trackedAuthors: readonly RepositoryAuthor[]
}

export type SelectedAuthorsFinding
  = | { readonly kind: "found", readonly authors: SelectedAuthors }
    | { readonly kind: "rejected", readonly message: string }

export const authorSelectionOf = (repository: Pick<SetupRepository, "selfAuthor" | "trackedAuthors">): AuthorSelection => ({
  selfAuthorId: repository.selfAuthor?.id ?? null,
  trackedAuthorIds: repository.trackedAuthors.map((author) => author.id),
})

type AuthorFinder = (authorId: string) => Promise<RepositoryAuthor | null>

const notAuthorMessage = (authorId: string): string => `${authorId} is not an author of this repository.`

const uniqueIds = (authorIds: readonly string[]): readonly string[] => [...new Set(authorIds)]

export const findSelectedAuthors = async (
  findAuthor: AuthorFinder,
  selection: AuthorSelection,
  isSelfAuthorNeeded: boolean,
): Promise<SelectedAuthorsFinding> => {
  const selfAuthorId = isSelfAuthorNeeded ? selection.selfAuthorId : null
  const trackedAuthorIds = uniqueIds(selection.trackedAuthorIds).filter((authorId) => authorId !== selfAuthorId)
  const selectedIds = selfAuthorId === null ? trackedAuthorIds : [selfAuthorId, ...trackedAuthorIds]
  const foundAuthors = await Promise.all(selectedIds.map(findAuthor))
  const missingPosition = foundAuthors.findIndex((author) => author === null)
  if (missingPosition >= 0) return { kind: "rejected", message: notAuthorMessage(selectedIds[missingPosition] ?? "") }
  const authors = foundAuthors.filter((author) => author !== null)
  return {
    kind: "found",
    authors: selfAuthorId === null
      ? { selfAuthor: null, trackedAuthors: authors }
      : { selfAuthor: authors[0] ?? null, trackedAuthors: authors.slice(1) },
  }
}
