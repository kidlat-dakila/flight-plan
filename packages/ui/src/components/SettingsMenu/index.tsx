import { BotIcon, FileTextIcon, FolderGit2Icon, GitMergeIcon, MoonIcon, SettingsIcon, SunIcon, type LucideIcon } from "lucide-react"
import type { ReactElement } from "react"
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/blocks/dropdown-menu"

export type SettingsSectionIcon = "agents" | "forges" | "configurations" | "repositories"

export interface SettingsMenuLink {
  readonly label: string
  readonly icon: SettingsSectionIcon
  readonly link: ReactElement
}

export interface ThemeToggle {
  readonly theme: "light" | "dark"
  readonly onToggle: () => void
}

interface SettingsMenuProps {
  readonly links: readonly SettingsMenuLink[]
  readonly useThemeToggle: () => ThemeToggle
}

const MENU_LABEL = "Settings"
const DARK_MODE_LABEL = "Switch to dark mode"
const LIGHT_MODE_LABEL = "Switch to light mode"
const TRIGGER_CLASSES = "flex size-8 shrink-0 items-center justify-center rounded-md text-sign-muted hover:bg-sign-foreground/10 hover:text-sign-foreground focus-visible:outline-2 focus-visible:outline-sign-foreground aria-expanded:bg-sign-foreground/15 aria-expanded:text-sign-foreground"

const SECTION_ICONS: Record<SettingsSectionIcon, LucideIcon> = {
  agents: BotIcon,
  forges: GitMergeIcon,
  configurations: FileTextIcon,
  repositories: FolderGit2Icon,
}

const ThemeToggleItem = ({ useThemeToggle }: { readonly useThemeToggle: () => ThemeToggle }) => {
  const { theme, onToggle } = useThemeToggle()
  const ThemeIcon = theme === "dark" ? SunIcon : MoonIcon
  return (
    <DropdownMenuItem onClick={onToggle}>
      <ThemeIcon aria-hidden="true" className="size-3.5" />
      {theme === "dark" ? LIGHT_MODE_LABEL : DARK_MODE_LABEL}
    </DropdownMenuItem>
  )
}

const SettingsMenu = ({ links, useThemeToggle }: SettingsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger aria-label={MENU_LABEL} title={MENU_LABEL} className={TRIGGER_CLASSES}>
      <SettingsIcon aria-hidden="true" className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <ThemeToggleItem useThemeToggle={useThemeToggle} />
      <DropdownMenuSeparator />
      {links.map(({ label, icon, link }) => {
        const SectionIcon = SECTION_ICONS[icon]
        return (
          <DropdownMenuItem key={label} render={link}>
            <SectionIcon aria-hidden="true" className="size-3.5" />
            {label}
          </DropdownMenuItem>
        )
      })}
    </DropdownMenuContent>
  </DropdownMenu>
)

export default SettingsMenu
