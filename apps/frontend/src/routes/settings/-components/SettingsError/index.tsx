import { useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import Button from "@flightplan/ui/blocks/button"

const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."

const SettingsError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <section role="alert" className="max-w-prose">
      <h2 className="text-2xl leading-8 font-bold tracking-[-0.015em]">Could not load the settings</h2>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <Button className="mt-4" onClick={() => { void router.invalidate() }}>Try again</Button>
    </section>
  )
}

export default SettingsError
