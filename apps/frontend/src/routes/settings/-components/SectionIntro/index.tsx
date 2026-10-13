import type { ReactNode } from "react"

interface SectionIntroProps {
  readonly title: string
  readonly children: ReactNode
}

const SectionIntro = ({ title, children }: SectionIntroProps) => (
  <header className="pb-6">
    <h2 className="text-2xl leading-8 font-bold tracking-[-0.015em] text-signal-text">{title}</h2>
    <p className="mt-2 max-w-[62ch] text-muted-foreground">{children}</p>
  </header>
)

export default SectionIntro
