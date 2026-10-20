import { Link } from "@tanstack/react-router"
import type { SettingsMenuLink } from "@flightplan/ui/SettingsMenu"

export const SETTINGS_LINKS: readonly SettingsMenuLink[] = [
  { label: "Agent integration", icon: "agents", link: <Link to="/settings/agents" /> },
  { label: "Git integrations", icon: "forges", link: <Link to="/settings/forges" /> },
  { label: "Prompt configurations", icon: "configurations", link: <Link to="/settings/profiles" /> },
  { label: "Repositories", icon: "repositories", link: <Link to="/settings/repositories" /> },
  { label: "Review configuration", icon: "review", link: <Link to="/settings/review" /> },
]
