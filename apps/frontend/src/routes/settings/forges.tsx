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
const DOCUMENT_TITLE = "Git integration • Settings • Flight Plan"
const TITLE = "Git integration"

const ForgesSettingsPage = () => {
  const trpc = useTRPC()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const saving = useSettingsSaving()
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        Flight Plan works with the git repositories on this computer. It reads branches and commits, fetches from your
        remotes in the background, and fast-forwards a branch when you update a review. It never commits, pushes or
        rewrites your history. Local git is always on, so every repository works without an account.
      </SectionIntro>
      <ForgesForm
        codeHostFeatures={page.codeHostFeatures}
        hasCodeHost={page.hasCodeHost}
        forges={page.forges}
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
