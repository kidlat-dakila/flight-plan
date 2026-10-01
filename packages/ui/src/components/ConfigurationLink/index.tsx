import { SettingsIcon } from "lucide-react"
import { buttonVariants } from "@/components/blocks/button"

interface ConfigurationLinkProps {
  readonly href: string
  readonly label: string
}

const ConfigurationLink = ({ href, label }: ConfigurationLinkProps) => (
  <a href={href} aria-label={label} title={label} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
    <SettingsIcon aria-hidden="true" />
  </a>
)

export default ConfigurationLink
