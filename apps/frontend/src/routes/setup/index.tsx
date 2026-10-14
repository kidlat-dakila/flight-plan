import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { use, useDeferredValue, useState } from "react"
import { createPortal } from "react-dom"
import { useAuthorsChoice } from "@/authors-choice"
import { BandSlotContext } from "@/band-slot"
import { useRepositoryFinder } from "@/repository-finder"
import { useTRPC } from "@/trpc"
import AddRepositoryDialog from "@flightplan/ui/AddRepositoryDialog"
import BandLine from "@flightplan/ui/BandLine"
import Button from "@flightplan/ui/blocks/button"
import { cn } from "@flightplan/ui/lib/utils"
import AgentsStep from "./-components/AgentsStep"
import ConfigurationStep from "./-components/ConfigurationStep"
import ForgesStep from "./-components/ForgesStep"
import RepositoriesStep, { type AuthorRole } from "./-components/RepositoriesStep"
import SetupRoute from "./-components/SetupRoute"
import SetupSkeleton from "./-components/SetupSkeleton"

const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const SETUP_LINE_CLASSES = "[--line:var(--primary)]"
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"
const BAND_HEADING = "Setup"
const DOCUMENT_TITLE = "Setup • Flight Plan"
const SEARCHING_MESSAGE = "Searching…"

interface AuthorQuery {
  readonly repositoryName: string
  readonly role: AuthorRole
  readonly query: string
}

interface RepositoriesSectionProps {
  readonly repositories: React.ComponentProps<typeof RepositoriesStep>["repositories"]
  readonly isReadyToFinish: boolean
  readonly finishHint: string | null
  readonly backStep: string | null
  readonly onChanged: () => Promise<void>
}

const RepositoriesSection = ({
  repositories,
  isReadyToFinish,
  finishHint,
  backStep,
  onChanged,
}: RepositoriesSectionProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [authorQuery, setAuthorQuery] = useState<AuthorQuery | null>(null)
  const finder = useRepositoryFinder(isAddOpen)
  const additionAuthors = useAuthorsChoice({ isEnabled: isAddOpen, folderPath: finder.search.query, repositoryName: null, saved: null })
  const deferredAuthorQuery = useDeferredValue(authorQuery)

  const authorSuggestions = useQuery({
    ...trpc.setup.searchAuthors.queryOptions({
      repositoryName: deferredAuthorQuery?.repositoryName ?? "",
      role: deferredAuthorQuery?.role ?? "tracked",
      query: deferredAuthorQuery?.query ?? "",
    }),
    enabled: deferredAuthorQuery !== null,
    placeholderData: keepPreviousData,
  })

  const addRepository = useMutation(
    trpc.setup.addRepository.mutationOptions({
      onSuccess: async () => {
        setIsAddOpen(false)
        finder.reset()
        additionAuthors.reset()
        await onChanged()
      },
    }),
  )
  const removeRepository = useMutation(trpc.setup.removeRepository.mutationOptions({ onSuccess: onChanged }))
  const setAuthorTracking = useMutation(trpc.setup.setAuthorTracking.mutationOptions({ onSuccess: onChanged }))
  const setSelfAuthor = useMutation(trpc.setup.setSelfAuthor.mutationOptions({ onSuccess: onChanged }))
  const completeSetup = useMutation(
    trpc.setup.complete.mutationOptions({
      onSuccess: async (completed) => {
        queryClient.removeQueries({ type: "inactive" })
        await navigate({ to: completed.redirectTo })
      },
    }),
  )

  const handleAddClose = () => {
    addRepository.reset()
    finder.reset()
    additionAuthors.reset()
    setIsAddOpen(false)
  }

  return (
    <>
      <RepositoriesStep
        repositories={repositories}
        repositoryErrorMessage={removeRepository.error?.message ?? null}
        authorSearch={{
          repositoryName: authorQuery?.repositoryName ?? null,
          role: authorQuery?.role ?? null,
          query: authorQuery?.query ?? "",
          options: authorSuggestions.data?.options ?? [],
          message: authorSuggestions.data?.message ?? (authorSuggestions.isPending ? SEARCHING_MESSAGE : null),
          errorMessage:
            authorSuggestions.error?.message ?? setAuthorTracking.error?.message ?? setSelfAuthor.error?.message ?? null,
        }}
        isReadyToFinish={isReadyToFinish}
        finishHint={finishHint}
        backStep={backStep}
        errorMessage={completeSetup.error?.message ?? null}
        isPending={completeSetup.isPending}
        onOpenAddRepository={() => { setIsAddOpen(true) }}
        onRemoveRepository={(name) => { removeRepository.mutate({ name }) }}
        onAuthorQueryChange={(repositoryName, role, query) => { setAuthorQuery({ repositoryName, role, query }) }}
        onSelfAuthorChange={(repositoryName, authorId) => {
          setAuthorQuery(null)
          setSelfAuthor.mutate({ repositoryName, authorId })
        }}
        onAuthorTrackingChange={(repositoryName, authorId, isTracked) => {
          setAuthorQuery(null)
          setAuthorTracking.mutate({ repositoryName, authorId, isTracked })
        }}
        onFinish={() => { completeSetup.mutate({}) }}
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
        onClose={handleAddClose}
      />
    </>
  )
}

interface AgentsSectionProps {
  readonly form: Omit<
    React.ComponentProps<typeof AgentsStep>,
    "folderBrowser" | "folderBrowserErrorMessage" | "onBrowseFolder" | "onBrowseEnd"
  >
}

const AgentsSection = ({ form }: AgentsSectionProps) => {
  const trpc = useTRPC()
  const [browsedPath, setBrowsedPath] = useState<string | null>(null)
  const folderBrowser = useQuery({
    ...trpc.setup.browseFolders.queryOptions({ path: browsedPath ?? "", purpose: "install-folder" }),
    enabled: browsedPath !== null,
  })

  return (
    <AgentsStep
      {...form}
      folderBrowser={browsedPath === null ? null : (folderBrowser.data ?? null)}
      folderBrowserErrorMessage={folderBrowser.error?.message ?? null}
      onBrowseFolder={setBrowsedPath}
      onBrowseEnd={() => { setBrowsedPath(null) }}
    />
  )
}

const SetupPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const bandSlot = use(BandSlotContext)
  const { step = null } = Route.useSearch()
  const { data: page } = useSuspenseQuery(trpc.setup.get.queryOptions({ step }))

  const refreshSetup = async () => {
    queryClient.removeQueries({ ...trpc.setup.pathFilter(), type: "inactive" })
    await queryClient.invalidateQueries(trpc.setup.pathFilter())
  }

  const saveStep = useMutation(
    trpc.setup.saveStep.mutationOptions({
      onSuccess: async (saving) => {
        if (saving.kind === "rejected") return
        await refreshSetup()
        await navigate({ search: { step: saving.nextStep } })
      },
    }),
  )
  const rejection = saveStep.data?.kind === "rejected" ? saveStep.data : null
  const problem = saveStep.error === null ? rejection : { message: saveStep.error.message, field: null }
  const { form } = page

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      {bandSlot === null
        ? null
        : createPortal(
            <>
              <BandLine lineColor="primary" />
              <p className="flex items-baseline gap-3">
                <span className="font-bold">{BAND_HEADING}</span>
                <span className="text-sm text-sign-muted tabular-nums">{page.progressLabel}</span>
              </p>
            </>,
            bandSlot,
          )}
      <header className="pb-8">
        <h1 className={PAGE_HEADING_CLASSES}>Welcome to Flight Plan</h1>
        <p className="mt-1 max-w-[62ch] text-muted-foreground">
          Let&apos;s get you ready for your first review. It takes four short steps, and each one is saved as you go, so
          you can stop and pick up where you left off.
        </p>
      </header>
      <div className={cn("grid gap-x-10 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]", SETUP_LINE_CLASSES)}>
        <div className="self-start lg:sticky lg:top-22">
          <SetupRoute stops={page.route} />
        </div>
        <div className="min-w-0">
          {form.step === "agents"
            ? (
                <AgentsSection
                  key={form.step}
                  form={{
                    agents: form.agents,
                    defaultAgent: form.defaultAgent,
                    connection: form.connection,
                    connectionOptions: form.connectionOptions,
                    backStep: page.backStep,
                    problem,
                    isPending: saveStep.isPending,
                    onSubmit: (choice) => { saveStep.mutate({ step: "agents", ...choice }) },
                  }}
                />
              )
            : null}
          {form.step === "forges"
            ? (
                <ForgesStep
                  key={form.step}
                  forges={form.forges}
                  defaultForge={form.defaultForge}
                  backStep={page.backStep}
                  problem={problem}
                  isPending={saveStep.isPending}
                  onSubmit={(choice) => { saveStep.mutate({ step: "forges", ...choice }) }}
                />
              )
            : null}
          {form.step === "configuration"
            ? (
                <ConfigurationStep
                  key={form.step}
                  presets={form.presets}
                  selectedConfigurationId={form.selectedConfigurationId}
                  backStep={page.backStep}
                  problem={problem}
                  isPending={saveStep.isPending}
                  onSubmit={(configurationId) => { saveStep.mutate({ step: "configuration", configurationId }) }}
                />
              )
            : null}
          {form.step === "repositories"
            ? (
                <RepositoriesSection
                  repositories={form.repositories}
                  isReadyToFinish={form.isReadyToFinish}
                  finishHint={form.finishHint}
                  backStep={page.backStep}
                  onChanged={refreshSetup}
                />
              )
            : null}
        </div>
      </div>
    </>
  )
}

const SetupError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <section role="alert" className="max-w-prose">
      <h1 className={PAGE_HEADING_CLASSES}>Could not load the setup</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <Button className="mt-4" onClick={() => { void router.invalidate() }}>Try again</Button>
    </section>
  )
}

export interface SetupSearch {
  readonly step?: string | undefined
}

export const Route = createFileRoute("/setup/")({
  validateSearch: (search: Record<string, unknown>): SetupSearch => ({
    step: typeof search.step === "string" ? search.step : undefined,
  }),
  loaderDeps: ({ search }) => ({ step: search.step ?? null }),
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    await queryClient.query({ ...trpc.setup.get.queryOptions(deps), staleTime: "static" })
  },
  component: SetupPage,
  pendingComponent: SetupSkeleton,
  errorComponent: SetupError,
})
