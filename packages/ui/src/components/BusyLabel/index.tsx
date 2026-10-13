import { LoaderCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BusyLabelProps {
  readonly label: string
  readonly className?: string
}

const BusyLabel = ({ label, className }: BusyLabelProps) => (
  <p role="status" className={cn("flex items-center gap-2 font-bold", className)}>
    <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
    {label}
  </p>
)

export default BusyLabel
