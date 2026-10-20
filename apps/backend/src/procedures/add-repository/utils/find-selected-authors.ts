import type { GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { RepositoryAuthor, SetupRepository } from "@/procedures/get-setup/utils/setup"

export interface TrackedSelection {
  readonly trackedAuthorIds: readonly string[]
}

export interface AuthorSelection extends TrackedSelection {
  readonly selfAuthorId: string | null
}

export interface SelectedAuthors {
  readonly selfAuthor: RepositoryAuthor | null
  readonly trackedAuthors: readonly RepositoryAuthor[]
}

export type SelectedAuthorsFinding
  = | { readonly kind: "found", readonly authors: SelectedAuthors }
    | { readonly kind: "rejected", readonly message: string }

export const trackedSelectionOf = (repository: Pick<SetupRepository, "trackedAuthors">): TrackedSelection => ({
  trackedAuthorIds: repository.trackedAuthors.map((author) => author.id),
})

export const withoutIdentityAuthor = (selection: TrackedSelection, identity: GitIdentity | null): TrackedSelection =>
  identity === null
    ? selection
    : { trackedAuthorIds: selection.trackedAuthorIds.filter((authorId) => authorId.toLowerCase() !== identity.email) }

export const withIdentityAsSelf = (selection: TrackedSelection, identity: GitIdentity | null): AuthorSelection => ({
  trackedAuthorIds: selection.trackedAuthorIds,
  selfAuthorId: identity?.email ?? null,
})

type AuthorFinder = (authorId: string) => Promise<RepositoryAuthor | null>

const notAuthorMessage = (authorId: string): string => `${authorId} is not an author of this repository.`

const uniqueIds = (authorIds: readonly string[]): readonly string[] => [...new Set(authorIds)]

export const findSelectedAuthors = async (
  findAuthor: AuthorFinder,
  selection: TrackedSelection,
): Promise<SelectedAuthorsFinding> => {
  const selectedIds = uniqueIds(selection.trackedAuthorIds)
  const foundAuthors = await Promise.all(selectedIds.map(findAuthor))
  const missingPosition = foundAuthors.findIndex((author) => author === null)
  if (missingPosition >= 0) return { kind: "rejected", message: notAuthorMessage(selectedIds[missingPosition] ?? "") }
  return { kind: "found", authors: { selfAuthor: null, trackedAuthors: foundAuthors.filter((author) => author !== null) } }
}
