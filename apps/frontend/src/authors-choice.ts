import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDeferredValue, useState } from "react"
import { useTRPC } from "@/trpc"
import type { AuthorRole, AuthorsChoice, ChosenAuthor } from "@flightplan/ui/RepositoryAuthors"

const SEARCHING_MESSAGE = "Searching…"

interface AuthorQuery {
  readonly role: AuthorRole
  readonly query: string
}

export interface AuthorSelection {
  readonly selfAuthorId: string | null
  readonly trackedAuthorIds: string[]
}

export interface SavedAuthors {
  readonly form: NonNullable<AuthorsChoice["form"]>
  readonly selfAuthor: ChosenAuthor | null
  readonly trackedAuthors: readonly ChosenAuthor[]
}

export interface AuthorsChoiceOptions {
  readonly isEnabled: boolean
  readonly folderPath: string
  readonly repositoryName: string | null
  readonly saved: SavedAuthors | null
}

export interface AuthorsChoiceState {
  readonly authors: AuthorsChoice
  readonly selection: AuthorSelection
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorSelect: (role: AuthorRole, authorId: string) => void
  readonly onSelfAuthorRemove: () => void
  readonly onTrackedAuthorRemove: (authorId: string) => void
  readonly reset: () => void
}

const NO_AUTHORS: readonly ChosenAuthor[] = []

const toChosenAuthor = ({ id, name, detail, avatarUrl, monogram }: ChosenAuthor): ChosenAuthor => ({
  id,
  name,
  detail,
  avatarUrl,
  monogram,
})

export const useAuthorsChoice = ({ isEnabled, folderPath, repositoryName, saved }: AuthorsChoiceOptions): AuthorsChoiceState => {
  const trpc = useTRPC()
  const [selfChange, setSelfChange] = useState<{ readonly author: ChosenAuthor | null } | null>(null)
  const [trackedChange, setTrackedChange] = useState<readonly ChosenAuthor[] | null>(null)
  const [authorQuery, setAuthorQuery] = useState<AuthorQuery | null>(null)
  const deferredAuthorQuery = useDeferredValue(authorQuery)
  const deferredFolderPath = useDeferredValue(folderPath)
  const selfAuthor = selfChange === null ? (saved?.selfAuthor ?? null) : selfChange.author
  const trackedAuthors = trackedChange ?? saved?.trackedAuthors ?? NO_AUTHORS
  const trackedAuthorIds = trackedAuthors.map((author) => author.id)

  const form = useQuery({
    ...trpc.repository.authorForm.queryOptions({ path: deferredFolderPath }),
    enabled: isEnabled && repositoryName === null,
    placeholderData: keepPreviousData,
  })
  const suggestions = useQuery({
    ...trpc.repository.searchAuthors.queryOptions({
      path: deferredFolderPath,
      repositoryName,
      role: deferredAuthorQuery?.role ?? "tracked",
      query: deferredAuthorQuery?.query ?? "",
      selfAuthorId: selfAuthor?.id ?? null,
      trackedAuthorIds,
    }),
    enabled: isEnabled && deferredAuthorQuery !== null,
    placeholderData: keepPreviousData,
  })

  const handleAuthorSelect = (role: AuthorRole, authorId: string) => {
    const option = suggestions.data?.options.find((offered) => offered.id === authorId)
    if (option === undefined) return
    const chosen = toChosenAuthor(option)
    setAuthorQuery(null)
    if (role === "self") {
      setSelfChange({ author: chosen })
      setTrackedChange(trackedAuthors.filter((author) => author.id !== chosen.id))
    } else {
      setTrackedChange([...trackedAuthors.filter((author) => author.id !== chosen.id), chosen])
    }
  }

  return {
    authors: {
      form: saved?.form ?? form.data ?? null,
      selfAuthor,
      trackedAuthors,
      search: {
        role: authorQuery?.role ?? null,
        query: authorQuery?.query ?? "",
        options: suggestions.data?.options ?? [],
        message: suggestions.data?.message ?? (suggestions.isPending ? SEARCHING_MESSAGE : null),
        errorMessage: suggestions.error?.message ?? null,
      },
    },
    selection: { selfAuthorId: selfAuthor?.id ?? null, trackedAuthorIds },
    onAuthorQueryChange: (role, query) => { setAuthorQuery({ role, query }) },
    onAuthorSelect: handleAuthorSelect,
    onSelfAuthorRemove: () => { setSelfChange({ author: null }) },
    onTrackedAuthorRemove: (authorId) => {
      setTrackedChange(trackedAuthors.filter((author) => author.id !== authorId))
    },
    reset: () => {
      setSelfChange(null)
      setTrackedChange(null)
      setAuthorQuery(null)
    },
  }
}
