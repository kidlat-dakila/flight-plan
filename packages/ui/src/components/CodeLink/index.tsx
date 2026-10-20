import type { ReactNode } from "react"
import HoverCard, { HoverCardContent, HoverCardTrigger } from "@/components/blocks/hover-card"
import CodeBlock from "@/components/CodeBlock"
import OutwardLink from "@/components/OutwardLink"
import type { CodeLinkTarget } from "@/lib/review-content"
import { cn } from "@/lib/utils"

interface CodeLinkProps {
  readonly target: CodeLinkTarget
  readonly isCode: boolean
  readonly children: ReactNode
  readonly onOpen: (anchorId: string) => void
}

export const HOVER_DELAY_MS = 150
const LINK_CLASSES = "rounded-sm underline decoration-primary-text/60 decoration-1 underline-offset-[0.3em] transition-colors duration-[180ms] ease-out hover:text-primary-text hover:decoration-primary-text"
const CODE_CLASSES = "font-mono text-[0.875em]"

const hrefOf = (target: CodeLinkTarget): string | undefined =>
  target.anchorId === null ? target.forgeLink?.href : `#${target.anchorId}`

export const CodeLinkPreview = ({ target }: { readonly target: CodeLinkTarget }) => (
  <HoverCardContent className="flex max-h-[26.25rem] w-[min(42.5rem,calc(100vw-2rem))] flex-col overflow-hidden">
    <div className="flex items-baseline justify-between gap-4 border-b px-3 py-2">
      <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{target.pathLabel}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{target.rangeLabel}</span>
    </div>
    <CodeBlock lines={target.lines} label={`${target.pathLabel}, ${target.rangeLabel}`} className="min-h-0 flex-1 overflow-y-auto" />
    {target.forgeLink === null
      ? null
      : (
          <div className="border-t px-3 py-1.5">
            <OutwardLink href={target.forgeLink.href} label={target.forgeLink.label} className="text-xs" />
          </div>
        )}
  </HoverCardContent>
)

const CodeLink = ({ target, isCode, children, onOpen }: CodeLinkProps) => {
  const { anchorId } = target
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={HOVER_DELAY_MS}
        href={hrefOf(target)}
        target={anchorId === null ? "_blank" : undefined}
        rel={anchorId === null ? "noreferrer" : undefined}
        className={cn(LINK_CLASSES, isCode ? CODE_CLASSES : "")}
        onClick={(event) => {
          if (anchorId === null) return
          event.preventDefault()
          onOpen(anchorId)
        }}
      >
        {children}
      </HoverCardTrigger>
      <CodeLinkPreview target={target} />
    </HoverCard>
  )
}

export default CodeLink
