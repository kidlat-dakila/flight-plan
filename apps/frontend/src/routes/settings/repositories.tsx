import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useAuthorsChoice } from "@/authors-choice"
import { useRepositoryFinder } from "@/repository-finder"
import { useTRPC } from "@/trpc"
import AddRepositoryDialog from "@flightplan/ui/AddRepositoryDialog"
import Button from "@flightplan/ui/blocks/button"
import ConfigureRepositoryDialog from "@flightplan/ui/ConfigureRepositoryDialog"
import FollowedRepository from "./-components/FollowedRepository"
import SectionIntro from "./-components/SectionIntro"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "repositories" } as const
const DOCUMENT_TITLE = "Repositories • Settings • Flight Plan"
const TITLE = "Repositories"

interface ConfiguringRepository {
  readonly name: string
  readonly configurationHref: string
}

const RepositoriesSettingsPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [configuring, setConfiguring] = useState<ConfiguringRepository | null>(null)
  const finder = useRepositoryFinder(isAddOpen)
  const additionAuthors = useAuthorsChoice({ isEnabled: isAddOpen, folderPath: finder.search.query, repositoryName: null, saved: null })
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

  const refreshRepositories = async () => {
    queryClient.removeQueries({ type: "inactive" })
    await Promise.all([
      queryClient.invalidateQueries(trpc.settings.pathFilter()),
      queryClient.invalidateQueries(trpc.repository.pathFilter()),
    ])
  }
  const closeAddition = () => {
    setIsAddOpen(false)
    finder.reset()
    additionAuthors.reset()
  }
  const closeConfiguration = () => {
    setConfiguring(null)
    configureAuthors.reset()
  }

  const addRepository = useMutation(
    trpc.repository.add.mutationOptions({
      onSuccess: async () => {
        closeAddition()
        await refreshRepositories()
      },
    }),
  )
  const configureRepository = useMutation(
    trpc.repository.configure.mutationOptions({
      onSuccess: async () => {
        closeConfiguration()
        await refreshRepositories()
      },
    }),
  )
  const removeRepository = useMutation(
    trpc.repository.remove.mutationOptions({
      onSuccess: async () => {
        closeConfiguration()
        await refreshRepositories()
      },
    }),
  )
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        Add the repositories you want to review. Flight Plan lists the pull requests and branches of each one on your
        home page. When your code is on GitHub, GitLab or Bitbucket, you see everyone's pull requests unless you pick
        specific team members. With local git, you see only the branches you add, plus those of any team members you pick.
      </SectionIntro>
      <div className="pb-6">
        <Button type="button" onClick={() => { setIsAddOpen(true) }}>Add repository</Button>
      </div>
      {page.emptyMessage === null
        ? null
        : <p className="border-t-2 border-foreground pt-5 text-sm text-muted-foreground">{page.emptyMessage}</p>}
      {page.repositories.map((repository) => (
        <FollowedRepository
          key={repository.name}
          name={repository.name}
          path={repository.path}
          lineColor={repository.lineColor}
          lineLabel={repository.lineLabel}
          selfAuthor={repository.selfAuthor}
          trackedAuthors={repository.trackedAuthors}
          emptyMessage={repository.emptyMessage}
          onConfigure={() => {
            setConfiguring({ name: repository.name, configurationHref: repository.configurationHref })
          }}
        />
      ))}
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
        onClose={() => {
          configureRepository.reset()
          removeRepository.reset()
          closeConfiguration()
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
