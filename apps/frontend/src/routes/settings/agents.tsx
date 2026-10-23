import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useSettingsSaving } from "@/settings-saving"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import AgentInteraction from "@flightplan/ui/AgentInteraction"
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
  const troubleshootFailure = useFailureTroubleshooting()
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
        Configure which agent you prefer and where Flight Plan installs the agent plugin and the MCP server.
      </SectionIntro>
      <AgentsForm
        agents={page.agents}
        defaultAgent={page.defaultAgent}
        problem={saving.problem}
        folderBrowser={browsedPath === null ? null : (folderBrowser.data ?? null)}
        folderBrowserErrorMessage={folderBrowser.error?.message ?? null}
        onFolderBrowserTroubleshoot={troubleshootFailure(folderBrowser.error)}
        onBrowseFolder={setBrowsedPath}
        onBrowseEnd={() => { setBrowsedPath(null) }}
        onSubmit={(choice) => { saving.save({ ...SECTION, ...choice }) }}
      >
        <AgentInteraction />
        <SettingsActions
          isPending={saving.isPending}
          errorMessage={saving.errorMessage}
          onTroubleshoot={saving.onTroubleshoot}
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
