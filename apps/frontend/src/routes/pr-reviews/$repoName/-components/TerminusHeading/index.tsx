import type { ReactNode } from "react"

interface TerminusHeadingProps {
  readonly heading: string
  readonly message: string
  readonly children?: ReactNode
}

const TerminusHeading = ({ heading, message, children }: TerminusHeadingProps) => (
  <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] pt-10">
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="h-9 w-1 bg-(--line)" />
      <span className="h-1 w-4 bg-(--line)" />
    </span>
    <div className="pt-5">
      <h2 className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">{heading}</h2>
      <p className="max-w-[62ch] text-muted-foreground">{message}</p>
      {children}
    </div>
  </div>
)

export default TerminusHeading
