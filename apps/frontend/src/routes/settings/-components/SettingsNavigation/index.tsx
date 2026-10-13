import { Link } from "@tanstack/react-router"

const NAVIGATION_LABEL = "Settings sections"

const SECTIONS = [
  { to: "/settings/agents", label: "Agents", purpose: "The coding agents that write your reviews" },
  { to: "/settings/forges", label: "Git forge", purpose: "Where your pull requests are hosted" },
  { to: "/settings/configuration", label: "Default configuration", purpose: "The configuration a new review starts with" },
  { to: "/settings/profiles", label: "Configurations", purpose: "How the agent writes a review" },
  { to: "/settings/repositories", label: "Repositories", purpose: "The repositories and users to follow" },
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
