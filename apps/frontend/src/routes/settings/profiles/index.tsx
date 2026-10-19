import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useId } from "react"
import SectionIntro from "@/routes/settings/-components/SectionIntro"
import SettingsError from "@/routes/settings/-components/SettingsError"
import SettingsSkeleton from "@/routes/settings/-components/SettingsSkeleton"
import { useTRPC } from "@/trpc"
import { buttonVariants } from "@flightplan/ui/blocks/button"
import ConfigurationGroup from "./-components/ConfigurationGroup"

const DOCUMENT_TITLE = "Prompt configurations • Settings • Flight Plan"
const TITLE = "Prompt configurations"
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
  const setDefault = useMutation(
    trpc.settings.save.mutationOptions({
      onSuccess: async () => {
        queryClient.removeQueries({ ...trpc.settings.pathFilter(), type: "inactive" })
        await queryClient.invalidateQueries(trpc.configuration.pathFilter())
      },
    }),
  )
  const defaultGroupId = useId()
  const duplicationError = duplicate.data?.kind === "rejected" ? duplicate.data.message : duplicate.error?.message ?? null
  const defaultError = setDefault.data?.kind === "rejected" ? setDefault.data.message : setDefault.error?.message ?? null
  const savedDefaultId = list.groups.flatMap((group) => group.rows).find((row) => row.isDefault)?.id ?? ""
  const pendingDefaultId = setDefault.isPending && setDefault.variables.section === "configuration"
    ? setDefault.variables.configurationId
    : null
  const chosenDefaultId = pendingDefaultId ?? savedDefaultId

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        A prompt configuration is the set of instructions the agent follows when it writes a review: the tone it writes
        in, how it words each part, and which sections it includes. A new Flight Plan uses the default unless you pick
        another. Open one to read or change its instructions, or duplicate one to make your own.
      </SectionIntro>
      <div className="pb-6">
        <Link to="/settings/profiles/create" className={buttonVariants()}>{CREATE_LABEL}</Link>
      </div>
      {duplicationError === null ? null : <p role="alert" className="pb-4 text-sm text-destructive">{duplicationError}</p>}
      {defaultError === null ? null : <p role="alert" className="pb-4 text-sm text-destructive">{defaultError}</p>}
      {list.groups.map((group) => (
        <ConfigurationGroup
          key={group.title}
          title={group.title}
          rows={group.rows}
          emptyMessage={group.emptyMessage}
          defaultChoice={{
            groupName: defaultGroupId,
            label: list.defaultChoiceHeading,
            chosenId: chosenDefaultId,
            isPending: setDefault.isPending,
            onChoose: (id) => { setDefault.mutate({ section: "configuration", configurationId: id }) },
          }}
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
