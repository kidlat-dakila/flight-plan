import { MessageSquareIcon } from "lucide-react"
import type { ReactNode } from "react"
import AgentMark from "@/components/AgentMark"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"
import { TooltipKeycap } from "@/components/IconButton"
import type { AgentName } from "@/lib/write-up-agent"

export interface Activity {
  readonly id: string
  readonly label: string
  readonly shortcutLabel: string
  readonly icon: ReactNode
  readonly isPressed: boolean
}

interface ActivityBarProps {
  readonly label: string
  readonly activities: readonly Activity[]
  readonly onToggle: (id: string) => void
}

const BUTTON_CLASSES = "grid size-9 cursor-pointer place-items-center rounded-[0.3rem] text-muted-foreground outline-none transition-colors duration-[180ms] ease-out hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-foreground aria-pressed:text-background [&_svg]:size-[1.125rem]"

export const ChatIcon = ({ agent }: { readonly agent: AgentName | null }) =>
  agent === null ? <MessageSquareIcon aria-hidden="true" /> : <AgentMark agent={agent} />

export const SectionsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M7 3v1.1M7 8.9v.9M7 14.2v1.1M7 19.7v1.3" strokeWidth="2.5" />
    <circle cx="7" cy="6.5" r="2.4" fill="currentColor" strokeWidth="1.6" />
    <circle cx="7" cy="12" r="2.2" strokeWidth="1.8" />
    <circle cx="7" cy="17.5" r="2.2" strokeWidth="1.8" />
    <path d="M12.5 6.5h8M12.5 12h6M12.5 17.5h7" strokeWidth="1.8" />
  </svg>
)

const ActivityBar = ({ label, activities, onToggle }: ActivityBarProps) => (
  <nav aria-label={label} className="flex h-full flex-col items-center gap-1.5 pt-3">
    {activities.map((activity) => (
      <Tooltip key={activity.id}>
        <TooltipTrigger
          render={(
            <button
              type="button"
              aria-label={activity.label}
              aria-pressed={activity.isPressed}
              data-user-action-id={`${activity.id}-panel-action`}
              className={BUTTON_CLASSES}
              onClick={() => { onToggle(activity.id) }}
            />
          )}
        >
          {activity.icon}
        </TooltipTrigger>
        <TooltipContent side="left">
          {activity.label}
          <TooltipKeycap label={activity.shortcutLabel} />
        </TooltipContent>
      </Tooltip>
    ))}
  </nav>
)

export default ActivityBar
