import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { useState } from "react"
import { useAuthorsChoice } from "@/authors-choice"
import { useRepositoryFinder } from "@/repository-finder"
import { useTRPC } from "@/trpc"
import AddRepositoryDialog from "@flightplan/ui/AddRepositoryDialog"
import Button from "@flightplan/ui/blocks/button"
import ConfigureRepositoryDialog from "@flightplan/ui/ConfigureRepositoryDialog"
import AuthorFilter from "./-components/AuthorFilter"
import EmptyRepositoryIndex from "./-components/EmptyRepositoryIndex"
import RepositoryIndexSkeleton from "./-components/RepositoryIndexSkeleton"
import RepositoryLine from "./-components/RepositoryLine"
import StatusFilter from "./-components/StatusFilter"

const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const REFRESH_INTERVAL_MS = 5000
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"

interface ConfiguringRepository {
  readonly name: string
  readonly configurationHref: string
}

const RepositoriesPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { status: statuses = null, author: authors = null } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: index } = useSuspenseQuery({
    ...trpc.repository.list.queryOptions({ statuses, authors }),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const finder = useRepositoryFinder(isFormOpen)
  const [configuring, setConfiguring] = useState<ConfiguringRepository | null>(null)
  const additionAuthors = useAuthorsChoice({ isEnabled: isFormOpen, folderPath: finder.search.query, repositoryName: null, saved: null })
  const addRepository = useMutation(
    trpc.repository.add.mutationOptions({
      onSuccess: async () => {
        setIsFormOpen(false)
        finder.reset()
        additionAuthors.reset()
        await queryClient.invalidateQueries(trpc.repository.list.pathFilter())
      },
    }),
  )

  const configuration = useQuery({
    ...trpc.repository.configuration.queryOptions({ name: configuring?.name ?? "" }),
    enabled: configuring !== null,
  })
  const configureAuthors = useAuthorsChoice({
    isEnabled: configuring !== null,
    folderPath: "",
    repositoryName: configuring?.name ?? null,
    saved: configuration.data ?? null,
  })
  const closeConfiguration = () => {
    setConfiguring(null)
    configureAuthors.reset()
  }
  const configureRepository = useMutation(
    trpc.repository.configure.mutationOptions({
      onSuccess: async () => {
        closeConfiguration()
        await queryClient.invalidateQueries(trpc.repository.pathFilter())
      },
    }),
  )
  const removeRepository = useMutation(
    trpc.repository.remove.mutationOptions({
      onSuccess: async () => {
        closeConfiguration()
        await queryClient.invalidateQueries(trpc.repository.pathFilter())
      },
    }),
  )

  const dismissNewTarget = useMutation(
    trpc.repository.dismissNewTarget.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.repository.list.pathFilter())
      },
    }),
  )

  const handleConfigurationClose = () => {
    configureRepository.reset()
    removeRepository.reset()
    closeConfiguration()
  }

  const handleCancel = () => {
    addRepository.reset()
    finder.reset()
    additionAuthors.reset()
    setIsFormOpen(false)
  }

  return (
    <>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-3">
        <h1 className={PAGE_HEADING_CLASSES}>Repositories</h1>
        {index.kind === "repositories"
          ? <p className="text-sm text-muted-foreground tabular-nums">{index.summaryLabel}</p>
          : null}
        <span className="flex-1" />
        <Button onClick={() => { setIsFormOpen(true) }}>Add repository</Button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-5">
        {index.notice === null ? <span /> : <p className="text-sm text-muted-foreground">{index.notice}</p>}
        {index.kind === "repositories"
          ? (
              <div className="flex flex-wrap gap-2">
                <StatusFilter
                  buttonLabel={index.statusFilter.buttonLabel}
                  isDefault={index.statusFilter.isDefault}
                  options={index.statusFilter.options}
                  onSelect={(selectedStatuses) => {
                    void navigate({ search: (search) => ({ ...search, status: [...selectedStatuses] }) })
                  }}
                  onReset={() => { void navigate({ search: (search) => ({ ...search, status: undefined }) }) }}
                />
                <AuthorFilter
                  buttonLabel={index.authorFilter.buttonLabel}
                  isDefault={index.authorFilter.isDefault}
                  options={index.authorFilter.options}
                  onSelect={(selectedAuthors) => {
                    void navigate({ search: (search) => ({ ...search, author: selectedAuthors?.slice() }) })
                  }}
                />
              </div>
            )
          : null}
      </div>
      <AddRepositoryDialog
        isOpen={isFormOpen}
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
        onClose={handleCancel}
      />
      <ConfigureRepositoryDialog
        isOpen={configuring !== null}
        name={configuring?.name ?? ""}
        path={configuration.data?.path ?? ""}
        configurationHref={configuring?.configurationHref ?? ""}
        authors={configureAuthors.authors}
        isSaving={configureRepository.isPending}
        isRemoving={removeRepository.isPending}
        errorMessage={
          configureRepository.error?.message ?? removeRepository.error?.message ?? configuration.error?.message ?? null
        }
        onAuthorQueryChange={configureAuthors.onAuthorQueryChange}
        onAuthorSelect={configureAuthors.onAuthorSelect}
        onSelfAuthorRemove={configureAuthors.onSelfAuthorRemove}
        onTrackedAuthorRemove={configureAuthors.onTrackedAuthorRemove}
        onSave={() => {
          if (configuring !== null) {
            configureRepository.mutate({ repositoryName: configuring.name, ...configureAuthors.selection })
          }
        }}
        onRemove={() => {
          if (configuring !== null) removeRepository.mutate({ name: configuring.name })
        }}
        onClose={handleConfigurationClose}
      />
      {index.kind === "repositories"
        ? index.repositories.map((repository) => (
            <RepositoryLine
              key={repository.name}
              name={repository.name}
              lineColor={repository.lineColor}
              lineLabel={repository.lineLabel}
              source={repository.source}
              countLabel={repository.countLabel}
              createReviewHref={repository.createReviewHref}
              configurationLabel={repository.configurationLabel}
              newTargets={repository.newTargets}
              content={repository.content}
              isDismissing={dismissNewTarget.isPending}
              onConfigure={() => {
                setConfiguring({ name: repository.name, configurationHref: repository.configurationHref })
              }}
              onDismissNewTarget={(targetId) => {
                dismissNewTarget.mutate({ repositoryName: repository.name, targetId })
              }}
            />
          ))
        : <EmptyRepositoryIndex />}
    </>
  )
}

const RepositoryIndexError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <section role="alert" className="max-w-prose">
      <h1 className={PAGE_HEADING_CLASSES}>Could not load your repositories</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <Button className="mt-4" onClick={() => { void router.invalidate() }}>Try again</Button>
    </section>
  )
}

export interface IndexSearch {
  readonly status?: string[] | undefined
  readonly author?: string[] | undefined
}

const stringListOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : undefined

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    status: stringListOf(search.status),
    author: stringListOf(search.author),
  }),
  loaderDeps: ({ search }) => ({ statuses: search.status ?? null, authors: search.author ?? null }),
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    await queryClient.query({ ...trpc.repository.list.queryOptions(deps), staleTime: "static" })
  },
  component: RepositoriesPage,
  pendingComponent: RepositoryIndexSkeleton,
  errorComponent: RepositoryIndexError,
})
