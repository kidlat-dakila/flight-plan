import { useRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"
import PlanePicture from "@/routes/-components/PlanePicture"
import { usePageErrorTroubleshooting } from "@/troubleshooting"
import Button from "@flightplan/ui/blocks/button"
import { cn } from "@flightplan/ui/lib/utils"
import { TROUBLESHOOT_LABEL } from "@flightplan/ui/ProblemAlert"

const SERVER_ERROR_PICTURE_SRC = "/server-error.svg"
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."

interface ServerErrorProps {
  readonly heading: string
  readonly error: unknown
  readonly className?: string
  readonly children?: ReactNode
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE)

const ServerError = ({ heading, error, className, children }: ServerErrorProps) => {
  const router = useRouter()
  const troubleshoot = usePageErrorTroubleshooting(error)
  return (
    <section role="alert" className={cn("mx-auto flex max-w-prose flex-col items-center text-center", className)}>
      <PlanePicture src={SERVER_ERROR_PICTURE_SRC} />
      <h1 className="mt-4 text-2xl font-bold tracking-[-0.01em]">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{messageOf(error)}</p>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={() => { void router.invalidate() }}>Try again</Button>
        <Button variant="outline" onClick={troubleshoot}>{TROUBLESHOOT_LABEL}</Button>
        {children}
      </div>
    </section>
  )
}

export default ServerError
