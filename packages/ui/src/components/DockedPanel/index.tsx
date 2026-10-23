import type { ReactNode } from "react"
import IconButton from "@/components/IconButton"
import { cn } from "@/lib/utils"

interface DockedPanelProps {
  readonly heading: string
  readonly detail?: ReactNode
  readonly actions?: ReactNode
  readonly side: "left" | "right"
  readonly hideLabel: string
  readonly shortcutLabel: string
  readonly className?: string
  readonly onHide: () => void
  readonly children: ReactNode
}

const DockedPanel = ({ heading, detail = null, actions = null, side, hideLabel, shortcutLabel, className, onHide, children }: DockedPanelProps) => (
  <aside aria-label={heading} className={cn("flex h-full min-h-0 flex-col", className)}>
    <div className="flex items-start gap-2 border-b py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-base leading-6 font-bold">{heading}</h2>
        {detail}
      </div>
      {actions}
      <IconButton
        icon={side === "left" ? "hideLeftPanel" : "hideRightPanel"}
        label={hideLabel}
        shortcutLabel={shortcutLabel}
        className="text-muted-foreground"
        onClick={onHide}
      />
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  </aside>
)

export default DockedPanel
