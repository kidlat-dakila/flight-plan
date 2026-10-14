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
        A coding agent writes each review. Flight Plan installs its skills, its plugin and its MCP server into the
        folder of each agent you pick, and installs them again each time you save.
      </SectionIntro>
      <AgentsForm
        agents={page.agents}
        defaultAgent={page.defaultAgent}
        connection={page.connection}
        connectionOptions={page.connectionOptions}
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
