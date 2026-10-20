import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import type { inferInput, TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { use, useDeferredValue, useState } from "react"
import { createPortal } from "react-dom"
import { useAuthorsChoice } from "@/authors-choice"
import { BandSlotContext } from "@/band-slot"
import { useRepositoryFinder } from "@/repository-finder"
import { useTRPC } from "@/trpc"
import type { AppRouter } from "@flightplan/backend/router"
import AddRepositoryDialog from "@flightplan/ui/AddRepositoryDialog"
import BandLine from "@flightplan/ui/BandLine"
import Button from "@flightplan/ui/blocks/button"
import { toRepositoryRows } from "@flightplan/ui/lib/repository-rows"
import { cn } from "@flightplan/ui/lib/utils"
import type { ReviewConfigurationChoice } from "@flightplan/ui/ReviewConfigurationForm"
import AgentsStep from "./-components/AgentsStep"
import ConfigurationStep from "./-components/ConfigurationStep"
import ForgesStep from "./-components/ForgesStep"
import RepositoriesStep, { type AuthorRole, type SetupRepository } from "./-components/RepositoriesStep"
import SetupRoute from "./-components/SetupRoute"
import SetupSkeleton from "./-components/SetupSkeleton"

const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const SETUP_LINE_CLASSES = "[--line:var(--primary)]"
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"
const BAND_HEADING = "Setup"
const DOCUMENT_TITLE = "Setup • Flight Plan"
const SEARCHING_MESSAGE = "Searching…"
const LOOKING_FOR_REPOSITORIES_MESSAGE = "Looking for your recent repositories…"
const RECENT_REPOSITORIES_STALE_MS = 60_000

type SpotlightClassification = inferInput<TRPCOptionsProxy<AppRouter>["reviewPreferences"]["save"]>["spotlight"][number]

interface AuthorQuery {
  readonly repositoryName: string
  readonly role: AuthorRole
  readonly query: string
}

interface RepositoriesSectionProps {
  readonly repositories: readonly SetupRepository[]
  readonly isReadyToContinue: boolean
  readonly continueHint: string | null
  readonly backStep: string | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onChanged: () => Promise<void>
  readonly onContinue: () => void
}

const RepositoriesSection = ({
  repositories,
  isReadyToContinue,
  continueHint,
  backStep,
  errorMessage,
  isPending,
  onChanged,
  onContinue,
}: RepositoriesSectionProps) => {
  const trpc = useTRPC()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [authorQuery, setAuthorQuery] = useState<AuthorQuery | null>(null)
  const finder = useRepositoryFinder(isAddOpen)
  const additionAuthors = useAuthorsChoice({ isEnabled: isAddOpen, folderPath: finder.search.query, repositoryName: null, saved: null })
  const deferredAuthorQuery = useDeferredValue(authorQuery)
  const recentRepositories = useQuery({
    ...trpc.setup.recentRepositories.queryOptions({}),
    staleTime: RECENT_REPOSITORIES_STALE_MS,
    placeholderData: keepPreviousData,
  })

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
  const followRepository = useMutation(trpc.setup.addRepository.mutationOptions({ onSuccess: onChanged }))
  const removeRepository = useMutation(trpc.setup.removeRepository.mutationOptions({ onSuccess: onChanged }))
  const setAuthorTracking = useMutation(trpc.setup.setAuthorTracking.mutationOptions({ onSuccess: onChanged }))
  const setSelfAuthor = useMutation(trpc.setup.setSelfAuthor.mutationOptions({ onSuccess: onChanged }))

  const handleAddClose = () => {
    addRepository.reset()
    finder.reset()
    additionAuthors.reset()
    setIsAddOpen(false)
  }

  const listMessage = recentRepositories.isPending
    ? LOOKING_FOR_REPOSITORIES_MESSAGE
    : (recentRepositories.error?.message ?? recentRepositories.data?.message ?? null)

  return (
    <>
      <RepositoriesStep
        rows={toRepositoryRows(recentRepositories.data?.repositories ?? [], repositories)}
        listMessage={listMessage}
        repositoryErrorMessage={followRepository.error?.message ?? removeRepository.error?.message ?? null}
        isChangingRepositories={followRepository.isPending || removeRepository.isPending}
        authorSearch={{
          repositoryName: authorQuery?.repositoryName ?? null,
          role: authorQuery?.role ?? null,
          query: authorQuery?.query ?? "",
          options: authorSuggestions.data?.options ?? [],
          message: authorSuggestions.data?.message ?? (authorSuggestions.isPending ? SEARCHING_MESSAGE : null),
          errorMessage:
            authorSuggestions.error?.message ?? setAuthorTracking.error?.message ?? setSelfAuthor.error?.message ?? null,
        }}
        isReadyToContinue={isReadyToContinue}
        continueHint={continueHint}
        backStep={backStep}
        errorMessage={errorMessage}
        isPending={isPending}
        onOpenAddRepository={() => { setIsAddOpen(true) }}
        onFollow={(path) => {
          removeRepository.reset()
          followRepository.mutate({ path, selfAuthorId: null, trackedAuthorIds: [] })
        }}
        onUnfollow={(name) => {
          followRepository.reset()
          removeRepository.mutate({ name })
        }}
        onAuthorQueryChange={(repositoryName, role, query) => { setAuthorQuery({ repositoryName, role, query }) }}
        onSelfAuthorChange={(repositoryName, authorId) => {
          setAuthorQuery(null)
          setSelfAuthor.mutate({ repositoryName, authorId })
        }}
        onAuthorTrackingChange={(repositoryName, authorId, isTracked) => {
          setAuthorQuery(null)
          setAuthorTracking.mutate({ repositoryName, authorId, isTracked })
        }}
        onContinue={onContinue}
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
  const completeSetup = useMutation(
    trpc.setup.complete.mutationOptions({
      onSuccess: async (completed) => {
        queryClient.removeQueries({ type: "inactive" })
        await navigate({ to: completed.redirectTo })
      },
    }),
  )
  const savePreferences = useMutation(trpc.reviewPreferences.save.mutationOptions())
  const finishSetup = ({ configurationId, preferences }: ReviewConfigurationChoice<SpotlightClassification>) => {
    saveStep.reset()
    savePreferences.mutate(preferences, {
      onSuccess: (preferencesSaving) => {
        if (preferencesSaving.kind === "rejected") return
        saveStep.mutate(
          { step: "configuration", configurationId },
          { onSuccess: (saving) => { if (saving.kind === "accepted") completeSetup.mutate({}) } },
        )
      },
    })
  }
  const preferencesRejection = savePreferences.data?.kind === "rejected" ? savePreferences.data : null
  const preferencesProblem = savePreferences.error === null
    ? preferencesRejection
    : { message: savePreferences.error.message, field: null }
  const rejection = saveStep.data?.kind === "rejected" ? saveStep.data : null
  const stepProblem = saveStep.error === null ? rejection : { message: saveStep.error.message, field: null }
  const saveProblem = preferencesProblem ?? stepProblem
  const problem = completeSetup.error === null ? saveProblem : { message: completeSetup.error.message, field: null }
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
                  codeHostFeatures={form.codeHostFeatures}
                  forges={form.forges}
                  backStep={page.backStep}
                  problem={problem}
                  isPending={saveStep.isPending}
                  onSubmit={(choice) => { saveStep.mutate({ step: "forges", ...choice }) }}
                  onSkip={() => { saveStep.mutate({ step: "forges", forges: [] }) }}
                />
              )
            : null}
          {form.step === "configuration"
            ? (
                <ConfigurationStep
                  key={form.step}
                  presets={form.presets}
                  selectedConfigurationId={form.selectedConfigurationId}
                  preferences={form.preferences}
                  spotlightGroups={form.spotlightGroups}
                  backStep={page.backStep}
                  problem={problem}
                  isPending={savePreferences.isPending || saveStep.isPending || completeSetup.isPending}
                  onSubmit={finishSetup}
                />
              )
            : null}
          {form.step === "repositories"
            ? (
                <RepositoriesSection
                  repositories={form.repositories}
                  isReadyToContinue={form.isReadyToContinue}
                  continueHint={form.continueHint}
                  backStep={page.backStep}
                  errorMessage={problem?.message ?? null}
                  isPending={saveStep.isPending}
                  onChanged={refreshSetup}
                  onContinue={() => { saveStep.mutate({ step: "repositories" }) }}
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
    const page = await queryClient.query({ ...trpc.setup.get.queryOptions(deps), staleTime: "static" })
    if (deps.step !== null) return
    queryClient.setQueryData(trpc.setup.get.queryKey({ step: page.form.step }), page)
    redirect({ to: "/setup", search: { step: page.form.step }, replace: true, throw: true })
  },
  component: SetupPage,
  pendingComponent: SetupSkeleton,
  errorComponent: SetupError,
})
