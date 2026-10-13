import type { ReactNode } from "react"

interface ContextSectionProps {
  readonly anchorId: string
  readonly heading: string
  readonly action?: ReactNode
  readonly children: ReactNode
}

const ContextSection = ({ anchorId, heading, action = null, children }: ContextSectionProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) pt-6 pb-8">
    <div className="flex items-center gap-3 pb-4">
      <h2 id={`${anchorId}-heading`} className="text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
      {action}
    </div>
    {children}
  </section>
)

export default ContextSection
