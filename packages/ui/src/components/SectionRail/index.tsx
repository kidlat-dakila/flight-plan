import { ArrowUpDownIcon } from "lucide-react"
import type { MouseEvent } from "react"
import Button from "@/components/blocks/button"
import IconButton from "@/components/IconButton"
import { cn } from "@/lib/utils"

export interface RailSection {
  readonly anchorId: string
  readonly label: string
  readonly children: readonly { readonly anchorId: string, readonly label: string }[]
}

export interface RailGroup {
  readonly anchorId: string
  readonly label: string | null
  readonly detailLabel: string | null
  readonly sections: readonly RailSection[]
}

interface SectionRailProps {
  readonly label: string
  readonly groups: readonly RailGroup[]
  readonly sections: readonly RailSection[]
  readonly currentAnchorId: string | null
  readonly onEditGroup?: ((anchorId: string) => void) | null
  readonly onArrangeGroups?: (() => void) | null
  readonly onJump?: ((anchorId: string) => void) | null
}

interface SectionStopsProps {
  readonly sections: readonly RailSection[]
  readonly currentAnchorId: string | null
  readonly onJump: ((anchorId: string) => void) | null
}

const ROW_CLASSES = "grid grid-cols-[2.5rem_1fr] items-center rounded-sm py-1.5 pr-2 text-sm hover:bg-muted"
const RING_TRANSITION = "transition-[fill,stroke] duration-[180ms] ease-out"
const LINE_CLASSES = "relative flex flex-col before:absolute before:top-4 before:bottom-4 before:left-[calc(1.25rem-2px)] before:w-1 before:bg-(--line)"

const jumpHandlerOf = (anchorId: string, onJump: ((anchorId: string) => void) | null) =>
  onJump === null
    ? undefined
    : (event: MouseEvent<HTMLAnchorElement>): void => {
        event.preventDefault()
        onJump(anchorId)
      }

const SectionStops = ({ sections, currentAnchorId, onJump }: SectionStopsProps) => (
  <ol className={LINE_CLASSES}>
    {sections.map((section) => (
      <li key={section.anchorId} className="relative flex flex-col">
        <a
          href={`#${section.anchorId}`}
          aria-current={section.anchorId === currentAnchorId ? "location" : undefined}
          data-user-action-id="rail-section-action"
          onClick={jumpHandlerOf(section.anchorId, onJump)}
          className={cn(ROW_CLASSES, "group/stop text-muted-foreground aria-[current]:font-semibold aria-[current]:text-primary-text")}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 justify-self-center">
            <circle
              cx="10"
              cy="10"
              r="7"
              className={cn(
                RING_TRANSITION,
                "fill-background stroke-muted-foreground [stroke-width:3] group-aria-[current]/stop:fill-(--line) group-aria-[current]/stop:stroke-(--line)",
              )}
            />
          </svg>
          <span className="leading-5">{section.label}</span>
        </a>
        {section.children.map((child) => (
          <a
            key={child.anchorId}
            href={`#${child.anchorId}`}
            aria-current={child.anchorId === currentAnchorId ? "location" : undefined}
            data-user-action-id="rail-file-action"
            onClick={jumpHandlerOf(child.anchorId, onJump)}
            className={cn(ROW_CLASSES, "group/stop py-1 text-[0.8125rem] text-muted-foreground aria-[current]:text-primary-text")}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 justify-self-center">
              <circle
                cx="10"
                cy="10"
                r="3.5"
                className={cn(RING_TRANSITION, "fill-background stroke-(--line) [stroke-width:2] group-aria-[current]/stop:fill-(--line)")}
              />
            </svg>
            <span className="leading-4">{child.label}</span>
          </a>
        ))}
      </li>
    ))}
  </ol>
)

const ARRANGE_LABEL = "Arrange"

const SectionRail = ({ label, groups, sections, currentAnchorId, onEditGroup = null, onArrangeGroups = null, onJump = null }: SectionRailProps) => (
  <nav aria-label={label} className="flex flex-col gap-2">
    {onArrangeGroups === null
      ? null
      : (
          <Button variant="ghost" size="sm" className="self-end" onClick={onArrangeGroups}>
            <ArrowUpDownIcon aria-hidden="true" />
            {ARRANGE_LABEL}
          </Button>
        )}
    {groups.map((group) => (
      <div key={group.anchorId} className="flex flex-col">
        {group.label === null
          ? null
          : (
              <div className="flex items-start">
                <a href={`#${group.anchorId}`} data-user-action-id="rail-segment-action" onClick={jumpHandlerOf(group.anchorId, onJump)} className={cn(ROW_CLASSES, "min-w-0 flex-1 items-start")}>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-5 justify-self-center">
                    <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" className="fill-(--line)" />
                  </svg>
                  <span className="flex min-w-0 flex-col">
                    <span className="leading-5 font-semibold text-foreground">{group.label}</span>
                    <span className="text-xs leading-4 text-muted-foreground tabular-nums">{group.detailLabel}</span>
                  </span>
                </a>
                {onEditGroup === null
                  ? null
                  : (
                      <IconButton
                        icon="edit"
                        label={`Edit ${group.label}`}
                        className="shrink-0 text-muted-foreground"
                        onClick={() => { onEditGroup(group.anchorId) }}
                      />
                    )}
              </div>
            )}
        <SectionStops sections={group.sections} currentAnchorId={currentAnchorId} onJump={onJump} />
      </div>
    ))}
    <div className="border-t pt-2">
      <SectionStops sections={sections} currentAnchorId={currentAnchorId} onJump={onJump} />
    </div>
  </nav>
)

export default SectionRail
