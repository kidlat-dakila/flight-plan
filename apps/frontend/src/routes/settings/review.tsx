import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useSettingsSaving } from "@/settings-saving"
import { useTRPC } from "@/trpc"
import ReviewConfigurationForm from "@flightplan/ui/ReviewConfigurationForm"
import SectionIntro from "./-components/SectionIntro"
import SettingsActions from "./-components/SettingsActions"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "review" } as const
const DOCUMENT_TITLE = "Review configuration • Settings • Flight Plan"
const TITLE = "Review configuration"

const ReviewSettingsPage = () => {
  const trpc = useTRPC()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const saving = useSettingsSaving()
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>Choose how Flight Plan puts your reviews together.</SectionIntro>
      <ReviewConfigurationForm
        presets={page.presets}
        selectedConfigurationId={page.selectedConfigurationId}
        preferences={page.preferences}
        spotlightGroups={page.spotlightGroups}
        problem={saving.problem}
        onSubmit={(choice) => { saving.save({ ...SECTION, ...choice }) }}
      >
        <SettingsActions
          isPending={saving.isPending}
          errorMessage={saving.errorMessage}
          onTroubleshoot={saving.onTroubleshoot}
          savedMessage={saving.savedMessage}
        />
      </ReviewConfigurationForm>
    </>
  )
}

export const Route = createFileRoute("/settings/review")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.settings.get.queryOptions(SECTION), staleTime: "static" })
  },
  component: ReviewSettingsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
