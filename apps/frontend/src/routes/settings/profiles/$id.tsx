import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import SettingsError from "@/routes/settings/-components/SettingsError"
import SettingsSkeleton from "@/routes/settings/-components/SettingsSkeleton"
import { useTRPC } from "@/trpc"
import Button from "@flightplan/ui/blocks/button"
import ConfigurationHeader from "./-components/ConfigurationHeader"
import FieldEditor from "./-components/FieldEditor"
import FieldIndex from "./-components/FieldIndex"
import PanelActions from "./-components/PanelActions"
import SwitchesForm from "./-components/SwitchesForm"

export interface ConfigurationSearch {
  readonly field?: string
}

const DOCUMENT_TITLE_SUFFIX = "Prompt configurations • Settings • Flight Plan"

const ConfigurationPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = Route.useParams()
  const { field = null } = Route.useSearch()
  const { data: page } = useSuspenseQuery(trpc.configuration.get.queryOptions({ id, field }))
  const [resetCount, setResetCount] = useState(0)

  const refresh = async () => {
    await queryClient.invalidateQueries(trpc.configuration.pathFilter())
  }
  const save = useMutation(
    trpc.configuration.save.mutationOptions({
      onSuccess: async (saving, change) => {
        if (saving.kind === "rejected") return
        await refresh()
        if (change.change === "reset") setResetCount((count) => count + 1)
      },
    }),
  )
  const duplicate = useMutation(
    trpc.configuration.create.mutationOptions({
      onSuccess: async (creation) => {
        if (creation.kind === "rejected") return
        await refresh()
        await navigate({ to: "/settings/profiles/$id", params: { id: creation.id } })
      },
    }),
  )
  const remove = useMutation(
    trpc.configuration.delete.mutationOptions({
      onSuccess: async (deletion) => {
        if (deletion.kind === "rejected") return
        await navigate({ to: "/settings/profiles" })
        await refresh()
      },
    }),
  )

  const isRename = save.variables?.change === "rename"
  const savingRejection = save.data?.kind === "rejected" ? save.data.message : save.error?.message ?? null
  const headerError
    = (isRename ? savingRejection : null)
      ?? (duplicate.data?.kind === "rejected" ? duplicate.data.message : duplicate.error?.message)
      ?? (remove.data?.kind === "rejected" ? remove.data.message : remove.error?.message)
      ?? null
  const panelActions = {
    isPending: save.isPending,
    errorMessage: isRename ? null : savingRejection,
    savedMessage: save.data?.kind === "saved" && !isRename ? save.data.message : null,
  }
  const { panel } = page

  return (
    <>
      <title>{`${page.name} • ${DOCUMENT_TITLE_SUFFIX}`}</title>
      <ConfigurationHeader
        name={page.name}
        originLabel={page.originLabel}
        notice={page.notice}
        canRename={page.canRename}
        canDelete={page.canDelete}
        duplicateLabel={page.duplicateLabel}
        isBusy={duplicate.isPending || remove.isPending}
        errorMessage={headerError}
        onDuplicate={() => { duplicate.mutate({ name: null, sourceId: id }) }}
        onRename={(name) => { save.mutate({ change: "rename", id, name }) }}
        onDelete={() => { remove.mutate({ id }) }}
      />
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="self-start lg:sticky lg:top-22">
          <FieldIndex
            configurationId={id}
            groups={page.index}
          />
        </div>
        <div className="min-w-0">
          {panel.kind === "switches"
            ? (
                <SwitchesForm
                  key={`${id}:${panel.contextKinds.map((option) => String(option.isRequired)).join()}`}
                  title={panel.title}
                  summary={panel.summary}
                  contextKindsTitle={panel.contextKindsTitle}
                  contextKindsHint={panel.contextKindsHint}
                  contextKinds={panel.contextKinds}
                  onSubmit={(contextCodeBlockKinds) => {
                    save.mutate({ change: "switches", id, contextCodeBlockKinds })
                  }}
                >
                  <PanelActions {...panelActions} />
                </SwitchesForm>
              )
            : (
                <FieldEditor
                  key={`${id}:${panel.path}:${String(resetCount)}`}
                  title={panel.title}
                  summary={panel.summary}
                  path={panel.path}
                  offMessage={panel.offMessage}
                  texts={panel.texts}
                  renderActions={(unsavedLabel, leaveQuestion) => (
                    <PanelActions {...panelActions} unsavedLabel={unsavedLabel} question={leaveQuestion}>
                      {panel.resetLabel === null
                        ? null
                        : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={save.isPending}
                              onClick={() => { save.mutate({ change: "reset", id, path: panel.path }) }}
                            >
                              {panel.resetLabel}
                            </Button>
                          )}
                    </PanelActions>
                  )}
                  onSubmit={(texts) => { save.mutate({ change: "field", id, path: panel.path, texts }) }}
                />
              )}
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings/profiles/$id")({
  validateSearch: (search: Record<string, unknown>): ConfigurationSearch =>
    typeof search.field === "string" ? { field: search.field } : {},
  loaderDeps: ({ search }) => ({ field: search.field ?? null }),
  loader: async ({ context: { queryClient, trpc }, params, deps }) => {
    await queryClient.query({ ...trpc.configuration.get.queryOptions({ id: params.id, field: deps.field }), staleTime: "static" })
  },
  component: ConfigurationPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
