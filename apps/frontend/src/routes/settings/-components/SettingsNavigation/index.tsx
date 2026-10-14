import { Link } from "@tanstack/react-router"

const NAVIGATION_LABEL = "Settings sections"

const SECTIONS = [
  { to: "/settings/agents", label: "Agent integration", purpose: "Configure how Flight Plan communicates with your agent" },
  { to: "/settings/forges", label: "Git integration", purpose: "Configure how Flight Plan communicates with your git setup" },
  { to: "/settings/profiles", label: "Prompt configurations", purpose: "Configure how the agent writes your reviews" },
  { to: "/settings/repositories", label: "Repositories", purpose: "Configure which repositories and team members Flight Plan follows" },
] as const

const SettingsNavigation = () => (
  <nav aria-label={NAVIGATION_LABEL}>
    <ul>
      {SECTIONS.map((section) => (
        <li key={section.to}>
          <Link
            to={section.to}
            className="group block border-l-4 border-border py-2 pl-4 hover:bg-muted data-[status=active]:border-(--line)"
          >
            <span className="block leading-6 group-data-[status=active]:font-bold group-data-[status=active]:text-signal-text">
              {section.label}
            </span>
            <span className="block text-sm text-muted-foreground">{section.purpose}</span>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)

export default SettingsNavigation
