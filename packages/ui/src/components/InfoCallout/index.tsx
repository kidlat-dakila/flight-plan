import { InfoIcon } from "lucide-react"
import type { ReactNode } from "react"
import Alert, { AlertDescription, AlertTitle } from "@/components/blocks/alert"
import { cn } from "@/lib/utils"

interface InfoCalloutProps {
  readonly title: string
  readonly children: ReactNode
  readonly className?: string
}

const InfoCallout = ({ title, children, className }: InfoCalloutProps) => (
  <Alert role="note" className={cn("border-line-blue/40 bg-line-blue/10 px-3 py-2.5 *:[svg]:text-line-blue", className)}>
    <InfoIcon aria-hidden="true" />
    <AlertTitle className="font-bold">{title}</AlertTitle>
    <AlertDescription className="text-foreground/80">{children}</AlertDescription>
  </Alert>
)

export default InfoCallout
