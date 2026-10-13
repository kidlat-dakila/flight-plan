import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import SectionIntro from "@/routes/settings/-components/SectionIntro"
import SettingsError from "@/routes/settings/-components/SettingsError"
import SettingsSkeleton from "@/routes/settings/-components/SettingsSkeleton"
import { useTRPC } from "@/trpc"
import { buttonVariants } from "@flightplan/ui/blocks/button"
import ConfigurationGroup from "./-components/ConfigurationGroup"

const DOCUMENT_TITLE = "Configurations • Settings • Flight Plan"
const TITLE = "Configurations"
const CREATE_LABEL = "New configuration"

const ConfigurationsPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: list } = useSuspenseQuery(trpc.configuration.list.queryOptions())
  const duplicate = useMutation(
    trpc.configuration.create.mutationOptions({
      onSuccess: async (creation) => {
        if (creation.kind === "rejected") return
        await queryClient.invalidateQueries(trpc.configuration.pathFilter())
        await navigate({ to: "/settings/profiles/$id", params: { id: creation.id } })
      },
    }),
  )
  const duplicationError = duplicate.data?.kind === "rejected" ? duplicate.data.message : duplicate.error?.message ?? null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        A configuration decides how the agent writes a review: its voice, how each field is worded and which sections
        it generates. Open one to read or change it, or duplicate one to start your own.
      </SectionIntro>
      <div className="pb-6">
        <Link to="/settings/profiles/create" className={buttonVariants()}>{CREATE_LABEL}</Link>
      </div>
      {duplicationError === null ? null : <p role="alert" className="pb-4 text-sm text-destructive">{duplicationError}</p>}
      {list.groups.map((group) => (
        <ConfigurationGroup
          key={group.title}
          title={group.title}
          rows={group.rows}
          emptyMessage={group.emptyMessage}
          isDuplicating={duplicate.isPending}
          onDuplicate={(id) => { duplicate.mutate({ name: null, sourceId: id }) }}
        />
      ))}
    </>
  )
}

export const Route = createFileRoute("/settings/profiles/")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.configuration.list.queryOptions(), staleTime: "static" })
  },
  component: ConfigurationsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
