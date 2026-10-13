import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useSettingsSaving } from "@/settings-saving"
import { useTRPC } from "@/trpc"
import ForgesForm from "@flightplan/ui/ForgesForm"
import SectionIntro from "./-components/SectionIntro"
import SettingsActions from "./-components/SettingsActions"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "forges" } as const
const DOCUMENT_TITLE = "Git forge • Settings • Flight Plan"
const TITLE = "Git forge"

const ForgesSettingsPage = () => {
  const trpc = useTRPC()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const saving = useSettingsSaving()
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        A forge hosts your pull requests. Pick every way Flight Plan may reach one, and choose the default. Local git
        works without a forge, with fewer features.
      </SectionIntro>
      <ForgesForm
        forges={page.forges}
        defaultForge={page.defaultForge}
        problem={saving.problem}
        onSubmit={(choice) => { saving.save({ ...SECTION, ...choice }) }}
      >
        <SettingsActions
          isPending={saving.isPending}
          errorMessage={saving.errorMessage}
          savedMessage={saving.savedMessage}
        />
      </ForgesForm>
    </>
  )
}

export const Route = createFileRoute("/settings/forges")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.settings.get.queryOptions(SECTION), staleTime: "static" })
  },
  component: ForgesSettingsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
