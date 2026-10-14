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
        Your pull requests live on a code hosting site such as GitHub, GitLab or Bitbucket. Connect Flight Plan to each
        one you use, through its command line tool or with a token, and pick which one to use by default. Local git
        needs no account: it reviews the branches on this computer, with fewer features.
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
