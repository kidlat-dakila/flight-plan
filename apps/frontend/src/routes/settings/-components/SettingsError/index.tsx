import { useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { usePageErrorTroubleshooting } from "@/troubleshooting"
import Button from "@flightplan/ui/blocks/button"
import { TROUBLESHOOT_LABEL } from "@flightplan/ui/ProblemAlert"

const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."

const SettingsError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  const troubleshoot = usePageErrorTroubleshooting(error)
  return (
    <section role="alert" className="max-w-prose">
      <h2 className="text-2xl leading-8 font-bold tracking-[-0.015em]">Could not load the settings</h2>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={() => { void router.invalidate() }}>Try again</Button>
        <Button variant="outline" onClick={troubleshoot}>{TROUBLESHOOT_LABEL}</Button>
      </div>
    </section>
  )
}

export default SettingsError
