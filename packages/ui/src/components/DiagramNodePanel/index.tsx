import type { ReactNode } from "react"
import CodeBlock from "@/components/CodeBlock"
import IconButton from "@/components/IconButton"
import OutwardLink from "@/components/OutwardLink"
import type { CodeLinkTarget } from "@/lib/review-content"

interface DiagramNodePanelProps {
  readonly title: string
  readonly kindLabel: string
  readonly target: CodeLinkTarget | null
  readonly children: ReactNode
  readonly onClose: () => void
}

const DiagramNodePanel = ({ title, kindLabel, target, children, onClose }: DiagramNodePanelProps) => (
  <section aria-label={title} className="flex min-h-full flex-col">
    <div className="sticky top-0 z-10 flex items-start gap-3 border-b bg-background px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{kindLabel}</p>
        <h3 className="text-base leading-6 font-bold wrap-anywhere">{title}</h3>
      </div>
      <IconButton icon="close" label="Close the code panel" onClick={onClose} />
    </div>
    <div className="flex flex-col gap-3 px-4 py-4 text-sm empty:hidden">{children}</div>
    {target === null
      ? null
      : (
          <div className="border-t">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
              <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{target.pathLabel}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{target.rangeLabel}</span>
            </div>
            <CodeBlock lines={target.lines} label={`${target.pathLabel}, ${target.rangeLabel}`} isWrapped className="border-y" />
            {target.forgeLink === null
              ? null
              : <OutwardLink href={target.forgeLink.href} label={target.forgeLink.label} className="mx-4 my-2 text-xs" />}
          </div>
        )}
  </section>
)

export default DiagramNodePanel
