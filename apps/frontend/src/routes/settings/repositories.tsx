import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useDeferredValue, useState } from "react"
import { useAuthorsChoice } from "@/authors-choice"
import { useRepositoryFinder } from "@/repository-finder"
import { useTRPC } from "@/trpc"
import AddRepositoryDialog from "@flightplan/ui/AddRepositoryDialog"
import { toRepositoryRows } from "@flightplan/ui/lib/repository-rows"
import RepositoryList, { type AuthorRole, type FollowedRepository } from "@flightplan/ui/RepositoryList"
import SectionIntro from "./-components/SectionIntro"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "repositories" } as const
const DOCUMENT_TITLE = "Repositories • Settings • Flight Plan"
const TITLE = "Repositories"
const SEARCHING_MESSAGE = "Searching…"
const LOOKING_FOR_REPOSITORIES_MESSAGE = "Looking for your recent repositories…"
const RECENT_REPOSITORIES_STALE_MS = 60_000
const PROMPT_CONFIGURATIONS_LABEL = "Prompt configurations"
const NO_FOLLOWED_REPOSITORIES: readonly SettingsRepository[] = []

interface SettingsRepository extends FollowedRepository {
  readonly configurationHref: string
  readonly emptyMessage: string | null
}

interface AuthorQuery {
  readonly repositoryName: string
  readonly role: AuthorRole
  readonly query: string
}

interface AuthorSelection {
  readonly selfAuthorId: string | null
  readonly trackedAuthorIds: string[]
}

const NO_SELECTION: AuthorSelection = { selfAuthorId: null, trackedAuthorIds: [] }

const chosenSelfAuthorIdOf = (repository: FollowedRepository): string | null =>
  repository.selfAuthor?.isChangeable === true ? (repository.selfAuthor.author?.id ?? null) : null

const authorSelectionOf = (repository: FollowedRepository | undefined): AuthorSelection =>
  repository === undefined
    ? NO_SELECTION
    : { selfAuthorId: chosenSelfAuthorIdOf(repository), trackedAuthorIds: repository.trackedAuthors.map((author) => author.id) }

const withTracking = (selection: AuthorSelection, authorId: string, isTracked: boolean): AuthorSelection => ({
  ...selection,
  trackedAuthorIds: isTracked
    ? [...selection.trackedAuthorIds.filter((id) => id !== authorId), authorId]
    : selection.trackedAuthorIds.filter((id) => id !== authorId),
})

const FollowedFooter = ({ repository }: { readonly repository: SettingsRepository }) => (
  <div className="grid gap-1">
    {repository.emptyMessage === null ? null : <p className="text-sm text-muted-foreground">{repository.emptyMessage}</p>}
    <a href={repository.configurationHref} className="w-fit text-sm underline">{PROMPT_CONFIGURATIONS_LABEL}</a>
  </div>
)

const RepositoriesSettingsPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [authorQuery, setAuthorQuery] = useState<AuthorQuery | null>(null)
  const finder = useRepositoryFinder(isAddOpen)
  const additionAuthors = useAuthorsChoice({ isEnabled: isAddOpen, folderPath: finder.search.query, repositoryName: null, saved: null })
  const deferredAuthorQuery = useDeferredValue(authorQuery)
  const repositories = page.section === SECTION.section ? page.repositories : NO_FOLLOWED_REPOSITORIES
  const findRepository = (name: string | undefined) => repositories.find((repository) => repository.name === name)

  const recentRepositories = useQuery({
    ...trpc.setup.recentRepositories.queryOptions({}),
    staleTime: RECENT_REPOSITORIES_STALE_MS,
    placeholderData: keepPreviousData,
  })
  const authorSuggestions = useQuery({
    ...trpc.repository.searchAuthors.queryOptions({
      path: "",
      repositoryName: deferredAuthorQuery?.repositoryName ?? null,
      role: deferredAuthorQuery?.role ?? "tracked",
      query: deferredAuthorQuery?.query ?? "",
      ...authorSelectionOf(findRepository(deferredAuthorQuery?.repositoryName)),
    }),
    enabled: deferredAuthorQuery !== null,
    placeholderData: keepPreviousData,
  })

  const refreshRepositories = async () => {
    queryClient.removeQueries({ type: "inactive" })
    await Promise.all([
      queryClient.invalidateQueries(trpc.settings.pathFilter()),
      queryClient.invalidateQueries(trpc.repository.pathFilter()),
      queryClient.invalidateQueries(trpc.setup.recentRepositories.pathFilter()),
    ])
  }
  const closeAddition = () => {
    setIsAddOpen(false)
    finder.reset()
    additionAuthors.reset()
  }

  const addRepository = useMutation(
    trpc.repository.add.mutationOptions({
      onSuccess: async () => {
        closeAddition()
        await refreshRepositories()
      },
    }),
  )
  const followRepository = useMutation(trpc.repository.add.mutationOptions({ onSuccess: refreshRepositories }))
  const removeRepository = useMutation(trpc.repository.remove.mutationOptions({ onSuccess: refreshRepositories }))
  const configureRepository = useMutation(trpc.repository.configure.mutationOptions({ onSuccess: refreshRepositories }))
  const configure = (repositoryName: string, selection: AuthorSelection) => {
    setAuthorQuery(null)
    configureRepository.mutate({ repositoryName, ...selection })
  }
  if (page.section !== SECTION.section) return null

  const listMessage = recentRepositories.isPending
    ? LOOKING_FOR_REPOSITORIES_MESSAGE
    : (recentRepositories.error?.message ?? recentRepositories.data?.message ?? null)

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        Pick the repositories Flight Plan follows, and it lists their pull requests and branches on your home page. The
        list starts with the ones you last committed to on main or master; add any other repository by hand. On GitHub,
        GitLab or Bitbucket you see everyone&apos;s pull requests unless you pick team members. With local git you see
        only the branches you add, plus those of the team members you pick.
      </SectionIntro>
      <RepositoryList
        rows={toRepositoryRows(recentRepositories.data?.repositories ?? [], repositories)}
        listMessage={listMessage}
        repositoryErrorMessage={
          followRepository.error?.message ?? removeRepository.error?.message ?? configureRepository.error?.message ?? null
        }
        isChangingRepositories={followRepository.isPending || removeRepository.isPending}
        authorSearch={{
          repositoryName: authorQuery?.repositoryName ?? null,
          role: authorQuery?.role ?? null,
          query: authorQuery?.query ?? "",
          options: authorSuggestions.data?.options ?? [],
          message: authorSuggestions.data?.message ?? (authorSuggestions.isPending ? SEARCHING_MESSAGE : null),
          errorMessage: authorSuggestions.error?.message ?? null,
        }}
        followedFooter={(repository) => <FollowedFooter repository={repository} />}
        onOpenAddRepository={() => { setIsAddOpen(true) }}
        onFollow={(path) => {
          removeRepository.reset()
          configureRepository.reset()
          followRepository.mutate({ path, ...NO_SELECTION })
        }}
        onUnfollow={(name) => {
          followRepository.reset()
          configureRepository.reset()
          removeRepository.mutate({ name })
        }}
        onAuthorQueryChange={(repositoryName, role, query) => { setAuthorQuery({ repositoryName, role, query }) }}
        onSelfAuthorChange={(repositoryName, authorId) => {
          configure(repositoryName, { ...authorSelectionOf(findRepository(repositoryName)), selfAuthorId: authorId })
        }}
        onAuthorTrackingChange={(repositoryName, authorId, isTracked) => {
          configure(repositoryName, withTracking(authorSelectionOf(findRepository(repositoryName)), authorId, isTracked))
        }}
      />
      <AddRepositoryDialog
        isOpen={isAddOpen}
        search={finder.search}
        browse={finder.browse}
        authors={additionAuthors.authors}
        isAdding={addRepository.isPending}
        errorMessage={addRepository.error?.message ?? null}
        onQueryChange={finder.onQueryChange}
        onChooseFolder={(path) => {
          addRepository.reset()
          finder.onChooseFolder(path)
        }}
        onAuthorQueryChange={additionAuthors.onAuthorQueryChange}
        onAuthorSelect={additionAuthors.onAuthorSelect}
        onSelfAuthorRemove={additionAuthors.onSelfAuthorRemove}
        onTrackedAuthorRemove={additionAuthors.onTrackedAuthorRemove}
        onSubmit={() => { addRepository.mutate({ path: finder.search.query, ...additionAuthors.selection }) }}
        onBrowse={() => {
          addRepository.reset()
          finder.onBrowse()
        }}
        onBrowseFolder={finder.onBrowseFolder}
        onBrowseClose={() => {
          addRepository.reset()
          finder.onBrowseClose()
        }}
        onClose={() => {
          addRepository.reset()
          closeAddition()
        }}
      />
    </>
  )
}

export const Route = createFileRoute("/settings/repositories")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.settings.get.queryOptions(SECTION), staleTime: "static" })
  },
  component: RepositoriesSettingsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
