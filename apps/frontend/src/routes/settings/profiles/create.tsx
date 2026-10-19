import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import SectionIntro from "@/routes/settings/-components/SectionIntro"
import SettingsError from "@/routes/settings/-components/SettingsError"
import SettingsSkeleton from "@/routes/settings/-components/SettingsSkeleton"
import { useTRPC } from "@/trpc"
import Button, { buttonVariants } from "@flightplan/ui/blocks/button"
import CreateConfigurationForm from "./-components/CreateConfigurationForm"

const DOCUMENT_TITLE = "New configuration • Settings • Flight Plan"
const TITLE = "New configuration"
const SUBMIT_LABEL = "Create"
const PENDING_LABEL = "Creating…"
const CANCEL_LABEL = "Cancel"

const CreateConfigurationPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: form } = useSuspenseQuery(trpc.configuration.creationForm.queryOptions())
  const create = useMutation(
    trpc.configuration.create.mutationOptions({
      onSuccess: async (creation) => {
        if (creation.kind === "rejected") return
        await queryClient.invalidateQueries(trpc.configuration.pathFilter())
        await navigate({ to: "/settings/profiles/$id", params: { id: creation.id } })
      },
    }),
  )
  const rejection = create.data?.kind === "rejected" ? create.data : null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        Name the configuration and choose what it starts from. You change its instructions on the next page.
      </SectionIntro>
      <CreateConfigurationForm
        sources={form.sources}
        selectedSourceId={form.selectedSourceId}
        nameError={rejection?.field === "name" ? rejection.message : null}
        sourceError={rejection?.field === "source" ? rejection.message : null}
        onSubmit={(name, sourceId) => { create.mutate({ name, sourceId }) }}
      >
        <footer className="mt-6 border-t border-border pt-4">
          {create.error === null ? null : <p role="alert" className="pb-3 text-sm text-destructive">{create.error.message}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link to="/settings/profiles" className={buttonVariants({ variant: "ghost" })}>{CANCEL_LABEL}</Link>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? PENDING_LABEL : SUBMIT_LABEL}</Button>
          </div>
        </footer>
      </CreateConfigurationForm>
    </>
  )
}

export const Route = createFileRoute("/settings/profiles/create")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.configuration.creationForm.queryOptions(), staleTime: "static" })
  },
  component: CreateConfigurationPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
