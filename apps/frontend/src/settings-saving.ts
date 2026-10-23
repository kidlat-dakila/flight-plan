import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { inferInput, TRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { useFailureTroubleshooting } from "@/troubleshooting"
import { useTRPC } from "@/trpc"
import type { AppRouter } from "@flightplan/backend/router"
import type { FormProblem } from "@flightplan/ui/lib/form-problem"

type SettingsChoice = inferInput<TRPCOptionsProxy<AppRouter>["settings"]["save"]>

export interface SettingsSaving {
  readonly problem: FormProblem | null
  readonly errorMessage: string | null
  readonly onTroubleshoot: (() => void) | null
  readonly savedMessage: string | null
  readonly isPending: boolean
  readonly save: (choice: SettingsChoice) => void
}

export const useSettingsSaving = (): SettingsSaving => {
  const trpc = useTRPC()
  const troubleshootFailure = useFailureTroubleshooting()
  const queryClient = useQueryClient()
  const saveSettings = useMutation(
    trpc.settings.save.mutationOptions({
      onSuccess: async (saving) => {
        if (saving.kind === "rejected") return
        queryClient.removeQueries({ type: "inactive" })
        await queryClient.invalidateQueries(trpc.settings.pathFilter())
      },
    }),
  )
  const rejection = saveSettings.data?.kind === "rejected" ? saveSettings.data : null
  const problem = saveSettings.error === null ? rejection : { message: saveSettings.error.message, field: null }
  return {
    problem,
    errorMessage: problem !== null && problem.field === null ? problem.message : null,
    onTroubleshoot: troubleshootFailure(saveSettings.error),
    savedMessage: saveSettings.data?.kind === "saved" ? saveSettings.data.message : null,
    isPending: saveSettings.isPending,
    save: saveSettings.mutate,
  }
}
