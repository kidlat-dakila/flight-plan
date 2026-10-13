import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useSettingsSaving } from "@/settings-saving"
import { useTRPC } from "@/trpc"
import DefaultConfigurationForm from "@flightplan/ui/DefaultConfigurationForm"
import SectionIntro from "./-components/SectionIntro"
import SettingsActions from "./-components/SettingsActions"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "configuration" } as const
const DOCUMENT_TITLE = "Configuration • Settings • Flight Plan"
const TITLE = "Default configuration"

const ConfigurationSettingsPage = () => {
  const trpc = useTRPC()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const saving = useSettingsSaving()
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        A configuration decides how the agent writes a review: the voice of its prose, how each part is worded, and
        which sections it generates. The default is used unless you pick another when you create a Flight Plan.
      </SectionIntro>
      <DefaultConfigurationForm
        presets={page.presets}
        selectedPreset={page.selectedPreset}
        onSubmit={(preset) => { saving.save({ ...SECTION, preset }) }}
      >
        <SettingsActions
          isPending={saving.isPending}
          errorMessage={saving.problem?.message ?? null}
          savedMessage={saving.savedMessage}
        />
      </DefaultConfigurationForm>
    </>
  )
}

export const Route = createFileRoute("/settings/configuration")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.settings.get.queryOptions(SECTION), staleTime: "static" })
  },
  component: ConfigurationSettingsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
