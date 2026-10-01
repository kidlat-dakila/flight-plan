import { Link } from "@tanstack/react-router"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"
import { keyed } from "@flightplan/ui/lib/keyed"
import { cn } from "@flightplan/ui/lib/utils"
import StopRing, { type StopStatus } from "@flightplan/ui/StopRing"

type StopState = "saved" | "current" | "upcoming"

interface RouteStop {
  readonly step: string
  readonly label: string
  readonly state: StopState
  readonly stateLabel: string
  readonly isReachable: boolean
  readonly lines: readonly (readonly LabelSegment[])[]
}

interface SetupRouteProps {
  readonly stops: readonly RouteStop[]
}

const NAVIGATION_LABEL = "Setup steps"

const RING_STATUSES: Record<StopState, StopStatus> = {
  saved: "merged",
  current: "no-review",
  upcoming: "draft",
}

const LABEL_CLASSES: Record<StopState, string> = {
  saved: "text-signal-text",
  current: "font-bold text-signal-text",
  upcoming: "text-muted-foreground",
}

const StopLabel = ({ stop }: { readonly stop: RouteStop }) => {
  if (stop.state === "current") return <span aria-current="step">{stop.label}</span>
  return stop.isReachable
    ? <Link to="/setup" search={{ step: stop.step }} className="rounded-sm underline decoration-input underline-offset-4 hover:decoration-foreground">{stop.label}</Link>
    : <span>{stop.label}</span>
}

const SetupRoute = ({ stops }: SetupRouteProps) => (
  <nav aria-label={NAVIGATION_LABEL}>
    <ol>
      {stops.map((stop) => (
        <li key={stop.step} className="group grid min-h-22 grid-cols-[2.5rem_minmax(0,1fr)]">
          <span aria-hidden="true" className="flex flex-col items-center">
            <span className="h-0.5 w-1 bg-(--line) group-first:invisible" />
            <StopRing status={RING_STATUSES[stop.state]} />
            <span className="w-1 flex-1 bg-(--line) group-last:invisible" />
          </span>
          <div className="pb-5">
            <p className={cn("leading-6", LABEL_CLASSES[stop.state])}>
              <StopLabel stop={stop} />
              <span className="sr-only">{`, ${stop.stateLabel}`}</span>
            </p>
            {keyed(stop.lines).map((line) => (
              <LabelSegments key={line.key} segments={line.item} className="text-sm text-muted-foreground" />
            ))}
          </div>
        </li>
      ))}
    </ol>
  </nav>
)

export default SetupRoute
