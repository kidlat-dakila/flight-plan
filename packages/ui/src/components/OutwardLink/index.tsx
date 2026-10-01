import { ExternalLinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface OutwardLinkProps {
  readonly href: string
  readonly label: string
  readonly className?: string
}

const OutwardLink = ({ href, label, className }: OutwardLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className={cn("inline-flex items-center gap-1 rounded-sm text-sm text-[var(--line,var(--muted-foreground))] hover:text-foreground", className)}
  >
    <span>{label}</span>
    <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
  </a>
)

export default OutwardLink
