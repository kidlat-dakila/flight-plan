import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useSettingsSaving } from "@/settings-saving"
import { useTRPC } from "@/trpc"
import AgentsForm from "@flightplan/ui/AgentsForm"
import SectionIntro from "./-components/SectionIntro"
import SettingsActions from "./-components/SettingsActions"
import SettingsError from "./-components/SettingsError"
import SettingsSkeleton from "./-components/SettingsSkeleton"

const SECTION = { section: "agents" } as const
const DOCUMENT_TITLE = "Agent integration • Settings • Flight Plan"
const TITLE = "Agent integration"

const AgentsSettingsPage = () => {
  const trpc = useTRPC()
  const { data: page } = useSuspenseQuery(trpc.settings.get.queryOptions(SECTION))
  const saving = useSettingsSaving()
  const [browsedPath, setBrowsedPath] = useState<string | null>(null)
  const folderBrowser = useQuery({
    ...trpc.setup.browseFolders.queryOptions({ path: browsedPath ?? "", purpose: "install-folder" }),
    enabled: browsedPath !== null,
  })
  if (page.section !== SECTION.section) return null

  return (
    <>
      <title>{DOCUMENT_TITLE}</title>
      <SectionIntro title={TITLE}>
        Flight Plan builds every review on its own, without a model: it splits the change into segments, draws the
        Trace Diagram and the Blast Diagram, and lays out the files and lines of the Code Walkthrough. What it
        can&apos;t do is explain the change: say what each part does and why, and spot the bugs it might hide. Your
        agent writes that part. Pick the agents you use, and where Flight Plan installs its plugin for each one.
      </SectionIntro>
      <AgentsForm
        agents={page.agents}
        defaultAgent={page.defaultAgent}
        problem={saving.problem}
        folderBrowser={browsedPath === null ? null : (folderBrowser.data ?? null)}
        folderBrowserErrorMessage={folderBrowser.error?.message ?? null}
        onBrowseFolder={setBrowsedPath}
        onBrowseEnd={() => { setBrowsedPath(null) }}
        onSubmit={(choice) => { saving.save({ ...SECTION, ...choice }) }}
      >
        <SettingsActions
          isPending={saving.isPending}
          errorMessage={saving.errorMessage}
          savedMessage={saving.savedMessage}
        />
      </AgentsForm>
    </>
  )
}

export const Route = createFileRoute("/settings/agents")({
  loader: async ({ context: { queryClient, trpc } }) => {
    await queryClient.query({ ...trpc.settings.get.queryOptions(SECTION), staleTime: "static" })
  },
  component: AgentsSettingsPage,
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
})
